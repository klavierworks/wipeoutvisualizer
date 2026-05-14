import { audioState } from '../../audio'
import { BPM_CONFIDENCE_GAIN, SHIP_BPM_SPEED_LERP, SHIP_BPM_SPEED_MULTIPLIER } from '../../constants'
import { lookupNumber, sortedKeys } from './lookupTable'

const KEYS = sortedKeys(SHIP_BPM_SPEED_MULTIPLIER)

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

let lastSampleTime = -1
let smoothedMultiplier = 0

const calculateTrustedTarget = (): number => {
  const lookupValue = lookupNumber(SHIP_BPM_SPEED_MULTIPLIER, KEYS, audioState.bpm)
  const trust = clamp01(audioState.bpmConfidence * BPM_CONFIDENCE_GAIN)

  return 1 + (lookupValue - 1) * trust
}

export const sampleBpmSpeedMultiplier = (currentTime: number): number => {
  const target = calculateTrustedTarget()

  if (lastSampleTime < 0) {
    lastSampleTime = currentTime
    smoothedMultiplier = target

    return smoothedMultiplier
  }

  const dt = currentTime - lastSampleTime

  if (dt <= 0) {
    return smoothedMultiplier
  }

  lastSampleTime = currentTime

  const alpha = 1 - Math.exp(-dt * SHIP_BPM_SPEED_LERP)
  smoothedMultiplier += (target - smoothedMultiplier) * alpha

  return smoothedMultiplier
}

export const calculateBpmSpeedMultiplier = (): number => smoothedMultiplier
