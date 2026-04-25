import {
  GLOBAL_MAX_BPM,
  GLOBAL_MIN_BPM,
  HOP_SAMPLES,
  MUSICAL_MAX_BPM,
  MUSICAL_MIN_BPM,
  OCTAVE_PROMOTE_RATIO,
  ONSET_NEIGHBOR_WINDOW,
  SECTION_CONTEXT_SEC,
  SECTION_MIN_SPACING_SEC,
  SECTION_PEAK_THRESHOLD,
  SECTION_SMOOTH_SEC,
  TEMPO_HOP_SEC,
  TEMPO_MERGE_BPM,
  TEMPO_SMOOTH_RADIUS,
  TEMPO_WINDOW_SEC,
} from './constants'

export type AnalyzeResult = {
  bpm: number
  offset: number
  sections: SectionMarker[]
  tempoSegments: TempoSegment[]
}
export type SectionMarker = { strength: number; time: number }
export type TempoSegment = { bpm: number; end: number; start: number }

const computeEnvelope = (pcm: Float32Array, hop: number): Float32Array => {
  const frames = Math.floor(pcm.length / hop)
  const envelope = new Float32Array(frames)

  for (let frame = 0; frame < frames; frame++) {
    let sum = 0
    const start = frame * hop

    for (let i = 0; i < hop; i++) {
      const value = pcm[start + i]

      sum += value * value
    }

    envelope[frame] = Math.sqrt(sum / hop)
  }

  return envelope
}

const positiveEnvelopeDiff = (envelope: Float32Array): Float32Array => {
  const out = new Float32Array(envelope.length)

  for (let i = 1; i < envelope.length; i++) {
    const delta = envelope[i] - envelope[i - 1]

    out[i] = delta > 0 ? delta : 0
  }

  return out
}

const subtractLocalMean = (signal: Float32Array, neighborhood: number): Float32Array => {
  const out = new Float32Array(signal.length)

  for (let i = 0; i < signal.length; i++) {
    let sum = 0
    let count = 0
    const low = Math.max(0, i - neighborhood)
    const high = Math.min(signal.length, i + neighborhood + 1)

    for (let j = low; j < high; j++) {
      sum += signal[j]
      count++
    }

    out[i] = Math.max(0, signal[i] - sum / count)
  }

  return out
}

const computeOnsetStrength = (envelope: Float32Array): Float32Array =>
  subtractLocalMean(positiveEnvelopeDiff(envelope), ONSET_NEIGHBOR_WINDOW)

const autocorrAtLag = (signal: Float32Array, lag: number, from = 0, to = signal.length): number => {
  let sum = 0
  const end = Math.min(to, signal.length) - lag

  for (let i = from; i < end; i++) {
    sum += signal[i] * signal[i + lag]
  }

  return sum
}

const autocorrelate = (signal: Float32Array, minLag: number, maxLag: number, from = 0, to = signal.length): number => {
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

const lagToBpm = (lag: number, fps: number): number => (60 * fps) / lag

const correctOctave = (signal: Float32Array, lag: number, fps: number, from = 0, to = signal.length): number => {
  const bestCorrelation = autocorrAtLag(signal, lag, from, to)
  const bpm = lagToBpm(lag, fps)

  if (bpm < MUSICAL_MIN_BPM) {
    const halved = Math.round(lag / 2)

    if (halved >= 2 && autocorrAtLag(signal, halved, from, to) > bestCorrelation * OCTAVE_PROMOTE_RATIO) {
      return halved
    }
  }

  if (bpm > MUSICAL_MAX_BPM) {
    const doubled = lag * 2

    if (autocorrAtLag(signal, doubled, from, to) > bestCorrelation * OCTAVE_PROMOTE_RATIO) {
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

    for (let pulse = 0; pulse < pulses; pulse++) {
      sum += signal[offset + pulse * period]
    }

    if (sum > bestValue) {
      bestValue = sum
      bestOffset = offset
    }
  }

  return bestOffset
}

type WindowedTempo = { bpm: number; time: number }

const windowedTempos = (
  onset: Float32Array,
  fps: number,
  minLag: number,
  maxLag: number,
  windowFrames: number,
  hopFrames: number,
): WindowedTempo[] => {
  const out: WindowedTempo[] = []

  for (let start = 0; start + windowFrames <= onset.length; start += hopFrames) {
    const end = start + windowFrames
    const lag = correctOctave(onset, autocorrelate(onset, minLag, maxLag, start, end), fps, start, end)

    out.push({ bpm: lagToBpm(lag, fps), time: start / fps })
  }

  return out
}

const medianSmoothBpm = (tempos: WindowedTempo[], radius: number): WindowedTempo[] =>
  tempos.map((entry, i) => {
    const low = Math.max(0, i - radius)
    const high = Math.min(tempos.length, i + radius + 1)
    const sorted = tempos
      .slice(low, high)
      .map((point) => point.bpm)
      .sort((a, b) => a - b)

    return { bpm: sorted[Math.floor(sorted.length / 2)], time: entry.time }
  })

const mergeAdjacentTempos = (tempos: WindowedTempo[]): TempoSegment[] => {
  const segments: TempoSegment[] = []

  for (const entry of tempos) {
    const last = segments[segments.length - 1]

    if (last && Math.abs(last.bpm - entry.bpm) < TEMPO_MERGE_BPM) {
      last.end = entry.time + TEMPO_HOP_SEC
      continue
    }

    if (last) {
      last.end = entry.time
    }

    segments.push({ bpm: entry.bpm, end: entry.time + TEMPO_HOP_SEC, start: entry.time })
  }

  if (segments.length > 0) {
    segments[0].start = 0
  }

  return segments
}

const detectTempoSegments = (onset: Float32Array, fps: number, minLag: number, maxLag: number): TempoSegment[] => {
  const windowFrames = Math.round(TEMPO_WINDOW_SEC * fps)
  const hopFrames = Math.round(TEMPO_HOP_SEC * fps)
  const tempos = windowedTempos(onset, fps, minLag, maxLag, windowFrames, hopFrames)
  const smoothed = medianSmoothBpm(tempos, TEMPO_SMOOTH_RADIUS)

  return mergeAdjacentTempos(smoothed)
}

const smoothEnvelope = (envelope: Float32Array, windowFrames: number): Float32Array => {
  const out = new Float32Array(envelope.length)
  let running = 0

  for (let i = 0; i < envelope.length; i++) {
    running += envelope[i]

    if (i >= windowFrames) {
      running -= envelope[i - windowFrames]
    }

    out[i] = running / Math.min(i + 1, windowFrames)
  }

  return out
}

const computeNovelty = (smoothed: Float32Array, contextFrames: number): Float32Array => {
  const novelty = new Float32Array(smoothed.length)

  for (let i = contextFrames; i < smoothed.length - contextFrames; i++) {
    let before = 0
    let after = 0

    for (let k = 0; k < contextFrames; k++) {
      before += smoothed[i - 1 - k]
      after += smoothed[i + k]
    }

    novelty[i] = Math.abs(after - before) / contextFrames
  }

  return novelty
}

const normalizeInPlace = (signal: Float32Array): boolean => {
  let max = 0

  for (let i = 0; i < signal.length; i++) {
    if (signal[i] > max) {
      max = signal[i]
    }
  }

  if (max === 0) {
    return false
  }

  for (let i = 0; i < signal.length; i++) {
    signal[i] /= max
  }

  return true
}

const pickPeaks = (novelty: Float32Array, fps: number, minSpacingFrames: number): SectionMarker[] => {
  const peaks: SectionMarker[] = [{ strength: 1, time: 0 }]
  let lastPeak = -minSpacingFrames

  for (let i = 1; i < novelty.length - 1; i++) {
    const isLocalMax = novelty[i] > novelty[i - 1] && novelty[i] >= novelty[i + 1]
    const isAboveThreshold = novelty[i] > SECTION_PEAK_THRESHOLD
    const isFarEnough = i - lastPeak >= minSpacingFrames

    if (isAboveThreshold && isLocalMax && isFarEnough) {
      peaks.push({ strength: novelty[i], time: i / fps })
      lastPeak = i
    }
  }

  return peaks
}

const detectSections = (envelope: Float32Array, fps: number): SectionMarker[] => {
  const smoothFrames = Math.round(SECTION_SMOOTH_SEC * fps)
  const contextFrames = Math.round(SECTION_CONTEXT_SEC * fps)
  const smoothed = smoothEnvelope(envelope, smoothFrames)
  const novelty = computeNovelty(smoothed, contextFrames)

  if (!normalizeInPlace(novelty)) {
    return [{ strength: 1, time: 0 }]
  }

  const minSpacingFrames = Math.round(SECTION_MIN_SPACING_SEC * fps)

  return pickPeaks(novelty, fps, minSpacingFrames)
}

const analyze = (pcm: Float32Array, sampleRate: number): AnalyzeResult => {
  const fps = sampleRate / HOP_SAMPLES
  const envelope = computeEnvelope(pcm, HOP_SAMPLES)
  const onset = computeOnsetStrength(envelope)

  const minLag = Math.round((60 / GLOBAL_MAX_BPM) * fps)
  const maxLag = Math.round((60 / GLOBAL_MIN_BPM) * fps)
  const globalLag = correctOctave(onset, autocorrelate(onset, minLag, maxLag), fps)
  const bpm = lagToBpm(globalLag, fps)
  const offset = findPhaseOffset(onset, globalLag) / fps

  const tempoSegments = detectTempoSegments(onset, fps, minLag, maxLag)
  const sections = detectSections(envelope, fps)

  return { bpm, offset, sections, tempoSegments }
}

const post = (message: unknown): void => {
  ;(self as unknown as Worker).postMessage(message)
}

self.onmessage = (event: MessageEvent<{ pcm: Float32Array; sampleRate: number }>) => {
  try {
    const { pcm, sampleRate } = event.data

    post(analyze(pcm, sampleRate))
  } catch (error) {
    post({ error: String(error) })
  }
}
