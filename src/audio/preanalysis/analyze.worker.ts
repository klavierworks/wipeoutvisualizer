import {
  HOP_SAMPLES,
  SECTION_CONTEXT_SEC,
  SECTION_MIN_SPACING_SEC,
  SECTION_PEAK_THRESHOLD,
  SECTION_SMOOTH_SEC,
} from '../constants'

export type AnalyzeResult = {
  sections: SectionMarker[]
}

export type SectionMarker = { strength: number; time: number }

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
  const sections = detectSections(envelope, fps)

  return { sections }
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
