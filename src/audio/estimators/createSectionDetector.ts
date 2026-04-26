import type { ExtractorFrame } from '../features/createExtractor'

import {
  BAND_COUNT,
  BUFFER_SIZE,
  SECTION_DEFAULT_BAR_SEC,
  SECTION_HISTORY_BARS,
  SECTION_RMS_FLOOR,
  SECTION_STRENGTH_NORMALIZE,
  SECTION_THRESHOLD_HIGH,
  SECTION_THRESHOLD_LOW,
  STREAMING_SECTION_MIN_SPACING_SEC,
} from '../constants'

export type SectionChange = {
  strength: number
  time: number
}

export type SectionDetector = {
  feedFrame: (frame: ExtractorFrame) => void
  onChange: (callback: SectionChangeListener) => () => void
}

type FrameRing = {
  bark: Float32Array
  count: number
  rms: Float32Array
  size: number
  times: Float32Array
  writeIndex: number
}

type SectionChangeListener = (change: SectionChange) => void

const createRing = (size: number): FrameRing => ({
  bark: new Float32Array(size * BAND_COUNT),
  count: 0,
  rms: new Float32Array(size),
  size,
  times: new Float32Array(size),
  writeIndex: 0,
})

const pushFrame = (ring: FrameRing, frame: ExtractorFrame): void => {
  const offset = ring.writeIndex * BAND_COUNT

  for (let i = 0; i < BAND_COUNT; i++) {
    ring.bark[offset + i] = frame.bark[i]
  }

  ring.rms[ring.writeIndex] = frame.rms
  ring.times[ring.writeIndex] = frame.time
  ring.writeIndex = (ring.writeIndex + 1) % ring.size
  ring.count = Math.min(ring.count + 1, ring.size)
}

const meanProfile = (ring: FrameRing, fromTime: number, toTime: number, target: Float32Array): number => {
  let count = 0
  let rmsSum = 0

  target.fill(0)

  for (let i = 0; i < ring.count; i++) {
    const slot = (ring.writeIndex - 1 - i + ring.size) % ring.size
    const time = ring.times[slot]

    if (time < fromTime || time >= toTime) {
      continue
    }

    const offset = slot * BAND_COUNT

    for (let j = 0; j < BAND_COUNT; j++) {
      target[j] += ring.bark[offset + j]
    }

    rmsSum += ring.rms[slot]
    count++
  }

  if (count === 0) {
    return 0
  }

  for (let j = 0; j < BAND_COUNT; j++) {
    target[j] /= count
  }

  return rmsSum / count
}

const l2Normalize = (vector: Float32Array): boolean => {
  let sum = 0

  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i]
  }

  if (sum <= 0) {
    return false
  }

  const length = Math.sqrt(sum)

  for (let i = 0; i < vector.length; i++) {
    vector[i] /= length
  }

  return true
}

const cosineDistance = (a: Float32Array, b: Float32Array): number => {
  let dot = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
  }

  return 1 - dot
}

export const createSectionDetector = (sampleRate: number, getBarSec: () => number): SectionDetector => {
  const fps = sampleRate / BUFFER_SIZE
  const maxBarSec = SECTION_DEFAULT_BAR_SEC * 2
  const ringSize = Math.ceil((SECTION_HISTORY_BARS + 1) * maxBarSec * fps) + 8
  const ring = createRing(ringSize)
  const currentProfile = new Float32Array(BAND_COUNT)
  const historyProfile = new Float32Array(BAND_COUNT)
  const listeners = new Set<SectionChangeListener>()

  let lastFireTime = -Infinity
  let isCandidate = false

  const evaluate = (frame: ExtractorFrame): void => {
    const barSec = Math.max(0.5, getBarSec())
    const currentEnd = frame.time
    const currentStart = currentEnd - barSec
    const historyEnd = currentStart
    const historyStart = historyEnd - SECTION_HISTORY_BARS * barSec

    const currentRms = meanProfile(ring, currentStart, currentEnd, currentProfile)
    const historyRms = meanProfile(ring, historyStart, historyEnd, historyProfile)

    if (currentRms < SECTION_RMS_FLOOR || historyRms < SECTION_RMS_FLOOR) {
      isCandidate = false

      return
    }

    if (!l2Normalize(currentProfile) || !l2Normalize(historyProfile)) {
      return
    }

    const distance = cosineDistance(currentProfile, historyProfile)

    if (distance < SECTION_THRESHOLD_LOW) {
      isCandidate = false

      return
    }

    if (distance < SECTION_THRESHOLD_HIGH) {
      return
    }

    if (isCandidate) {
      return
    }

    if (frame.time - lastFireTime < STREAMING_SECTION_MIN_SPACING_SEC) {
      return
    }

    isCandidate = true
    lastFireTime = frame.time

    const strength = Math.max(0, Math.min(1, distance / SECTION_STRENGTH_NORMALIZE))
    const change: SectionChange = { strength, time: frame.time }

    for (const listener of listeners) {
      listener(change)
    }
  }

  return {
    feedFrame: (frame) => {
      pushFrame(ring, frame)
      evaluate(frame)
    },
    onChange: (callback) => {
      listeners.add(callback)

      return () => {
        listeners.delete(callback)
      }
    },
  }
}
