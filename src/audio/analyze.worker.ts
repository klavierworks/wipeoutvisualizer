// Offline analysis worker. Given a mono PCM buffer + sample rate, returns:
//   - bpm + downbeat offset (global best estimate)
//   - tempoSegments: per-window BPM so tempo changes are captured
//   - sections: timestamps where the track crosses into a new musical region,
//     measured from energy novelty (chorus drops, breakdowns, outros)
//
// Runs off the main thread. No dependencies; all primitives sit in this file
// so the algorithm is inspectable in one place.

const HOP_SAMPLES = 512 // envelope & onset stride (~11.6ms at 44.1kHz)

const GLOBAL_MIN_BPM = 60
const GLOBAL_MAX_BPM = 180
const MUSICAL_MIN_BPM = 90
const MUSICAL_MAX_BPM = 175
const OCTAVE_PROMOTE_RATIO = 0.55

const TEMPO_WINDOW_SEC = 10
const TEMPO_HOP_SEC = 2
const TEMPO_MERGE_BPM = 1 // segments within this BPM get merged

const SECTION_SMOOTH_SEC = 2 // envelope smoothing window
const SECTION_CONTEXT_SEC = 4 // before/after window for novelty
const SECTION_MIN_SPACING_SEC = 6
const SECTION_PEAK_THRESHOLD = 0.25 // normalized novelty threshold

export type TempoSegment = { start: number; end: number; bpm: number }
export type SectionMarker = { time: number; strength: number }
export type AnalyzeResult = {
  bpm: number
  offset: number
  tempoSegments: TempoSegment[]
  sections: SectionMarker[]
}

// --- envelope & onset strength ---------------------------------------------

const computeEnvelope = (pcm: Float32Array, hop: number): Float32Array => {
  const frames = Math.floor(pcm.length / hop)
  const env = new Float32Array(frames)
  for (let f = 0; f < frames; f++) {
    let sum = 0
    const start = f * hop
    for (let i = 0; i < hop; i++) {
      const v = pcm[start + i]
      sum += v * v
    }
    env[f] = Math.sqrt(sum / hop)
  }
  return env
}

const computeOnsetStrength = (env: Float32Array): Float32Array => {
  const diff = new Float32Array(env.length)
  for (let i = 1; i < env.length; i++) {
    const d = env[i] - env[i - 1]
    diff[i] = d > 0 ? d : 0
  }
  const win = 20
  const out = new Float32Array(diff.length)
  for (let i = 0; i < diff.length; i++) {
    let sum = 0
    let count = 0
    const lo = Math.max(0, i - win)
    const hi = Math.min(diff.length, i + win + 1)
    for (let j = lo; j < hi; j++) {
      sum += diff[j]
      count++
    }
    out[i] = Math.max(0, diff[i] - sum / count)
  }
  return out
}

// --- BPM detection ----------------------------------------------------------

const autocorrAtLag = (signal: Float32Array, lag: number, from = 0, to = signal.length) => {
  let sum = 0
  const end = Math.min(to, signal.length) - lag
  for (let i = from; i < end; i++) sum += signal[i] * signal[i + lag]
  return sum
}

const autocorrelate = (
  signal: Float32Array,
  minLag: number,
  maxLag: number,
  from = 0,
  to = signal.length,
): number => {
  let bestLag = minLag
  let bestValue = -Infinity
  for (let lag = minLag; lag <= maxLag; lag++) {
    const sum = autocorrAtLag(signal, lag, from, to)
    if (sum > bestValue) {
      bestValue = sum
      bestLag = lag
    }
  }
  return bestLag
}

const correctOctave = (
  signal: Float32Array,
  lag: number,
  fps: number,
  from = 0,
  to = signal.length,
): number => {
  const bpmOf = (l: number) => (60 * fps) / l
  const bestCorr = autocorrAtLag(signal, lag, from, to)

  if (bpmOf(lag) < MUSICAL_MIN_BPM) {
    const halved = Math.round(lag / 2)
    if (halved >= 2 && autocorrAtLag(signal, halved, from, to) > bestCorr * OCTAVE_PROMOTE_RATIO) {
      return halved
    }
  }
  if (bpmOf(lag) > MUSICAL_MAX_BPM) {
    const doubled = lag * 2
    if (autocorrAtLag(signal, doubled, from, to) > bestCorr * OCTAVE_PROMOTE_RATIO) {
      return doubled
    }
  }
  return lag
}

const findPhaseOffset = (signal: Float32Array, period: number): number => {
  let bestOffset = 0
  let bestValue = -Infinity
  const pulses = Math.floor(signal.length / period) - 1
  for (let offset = 0; offset < period; offset++) {
    let sum = 0
    for (let p = 0; p < pulses; p++) {
      sum += signal[offset + p * period]
    }
    if (sum > bestValue) {
      bestValue = sum
      bestOffset = offset
    }
  }
  return bestOffset
}

const detectTempoSegments = (
  onset: Float32Array,
  fps: number,
  minLag: number,
  maxLag: number,
): TempoSegment[] => {
  const windowFrames = Math.round(TEMPO_WINDOW_SEC * fps)
  const hopFrames = Math.round(TEMPO_HOP_SEC * fps)
  const per: { time: number; bpm: number }[] = []

  for (let start = 0; start + windowFrames <= onset.length; start += hopFrames) {
    const end = start + windowFrames
    const lag = correctOctave(
      onset,
      autocorrelate(onset, minLag, maxLag, start, end),
      fps,
      start,
      end,
    )
    per.push({ time: start / fps, bpm: (60 * fps) / lag })
  }

  // Median-smooth to kill single-window outliers, then merge adjacent windows
  // whose BPMs are close enough to call the same segment.
  const smoothed = per.map((p, i) => {
    const lo = Math.max(0, i - 1)
    const hi = Math.min(per.length, i + 2)
    const window = per.slice(lo, hi).map((x) => x.bpm).sort((a, b) => a - b)
    return { time: p.time, bpm: window[Math.floor(window.length / 2)] }
  })

  const segments: TempoSegment[] = []
  for (const entry of smoothed) {
    const last = segments[segments.length - 1]
    if (last && Math.abs(last.bpm - entry.bpm) < TEMPO_MERGE_BPM) {
      last.end = entry.time + TEMPO_HOP_SEC
    } else {
      if (last) last.end = entry.time
      segments.push({ start: entry.time, end: entry.time + TEMPO_HOP_SEC, bpm: entry.bpm })
    }
  }
  if (segments.length > 0) segments[0].start = 0
  return segments
}

// --- section / structural segmentation --------------------------------------

const smoothEnvelope = (env: Float32Array, windowFrames: number): Float32Array => {
  const out = new Float32Array(env.length)
  let running = 0
  for (let i = 0; i < env.length; i++) {
    running += env[i]
    if (i >= windowFrames) running -= env[i - windowFrames]
    out[i] = running / Math.min(i + 1, windowFrames)
  }
  return out
}

const detectSections = (env: Float32Array, fps: number): SectionMarker[] => {
  const smoothFrames = Math.round(SECTION_SMOOTH_SEC * fps)
  const ctxFrames = Math.round(SECTION_CONTEXT_SEC * fps)
  const smooth = smoothEnvelope(env, smoothFrames)

  // Novelty: absolute change between past and future windows at each point.
  const novelty = new Float32Array(smooth.length)
  for (let i = ctxFrames; i < smooth.length - ctxFrames; i++) {
    let before = 0
    let after = 0
    for (let k = 0; k < ctxFrames; k++) {
      before += smooth[i - 1 - k]
      after += smooth[i + k]
    }
    novelty[i] = Math.abs(after - before) / ctxFrames
  }

  let max = 0
  for (let i = 0; i < novelty.length; i++) if (novelty[i] > max) max = novelty[i]
  if (max === 0) return [{ time: 0, strength: 1 }]
  for (let i = 0; i < novelty.length; i++) novelty[i] /= max

  // Peak picking: strict local maxima above threshold, enforced min spacing.
  const minSpacingFrames = Math.round(SECTION_MIN_SPACING_SEC * fps)
  const peaks: SectionMarker[] = [{ time: 0, strength: 1 }]
  let lastPeak = -minSpacingFrames
  for (let i = 1; i < novelty.length - 1; i++) {
    if (
      novelty[i] > SECTION_PEAK_THRESHOLD &&
      novelty[i] > novelty[i - 1] &&
      novelty[i] >= novelty[i + 1] &&
      i - lastPeak >= minSpacingFrames
    ) {
      peaks.push({ time: i / fps, strength: novelty[i] })
      lastPeak = i
    }
  }
  return peaks
}

// --- main entry -------------------------------------------------------------

const analyze = (pcm: Float32Array, sampleRate: number): AnalyzeResult => {
  const fps = sampleRate / HOP_SAMPLES
  const env = computeEnvelope(pcm, HOP_SAMPLES)
  const onset = computeOnsetStrength(env)

  const minLag = Math.round((60 / GLOBAL_MAX_BPM) * fps)
  const maxLag = Math.round((60 / GLOBAL_MIN_BPM) * fps)
  const globalLag = correctOctave(onset, autocorrelate(onset, minLag, maxLag), fps)
  const bpm = (60 * fps) / globalLag
  const offset = findPhaseOffset(onset, globalLag) / fps

  const tempoSegments = detectTempoSegments(onset, fps, minLag, maxLag)
  const sections = detectSections(env, fps)

  return { bpm, offset, tempoSegments, sections }
}

self.onmessage = (event: MessageEvent<{ pcm: Float32Array; sampleRate: number }>) => {
  try {
    const { pcm, sampleRate } = event.data
    const result = analyze(pcm, sampleRate)
    ;(self as unknown as Worker).postMessage(result)
  } catch (error) {
    ;(self as unknown as Worker).postMessage({ error: String(error) })
  }
}
