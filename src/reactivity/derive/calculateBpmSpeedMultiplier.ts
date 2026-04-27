import { audioState } from '../../audio'
import { SHIP_BPM_SPEED_LERP, SHIP_BPM_SPEED_MULTIPLIER } from '../../constants'
import { lookupNumber, sortedKeys } from './lookupTable'

const KEYS = sortedKeys(SHIP_BPM_SPEED_MULTIPLIER)

let lastSampleTime = -1
let smoothedMultiplier = 0

export const sampleBpmSpeedMultiplier = (currentTime: number): number => {
  const target = lookupNumber(SHIP_BPM_SPEED_MULTIPLIER, KEYS, audioState.bpm)

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
