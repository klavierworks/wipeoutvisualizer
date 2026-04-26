import { audioState } from '../../audio'
import { SHIP_BPM_SPEED_MULTIPLIER } from '../../constants'
import { lookupNumber, sortedKeys } from './lookupTable'

const KEYS = sortedKeys(SHIP_BPM_SPEED_MULTIPLIER)

export const calculateBpmSpeedMultiplier = (): number =>
  lookupNumber(SHIP_BPM_SPEED_MULTIPLIER, KEYS, audioState.bpm)
