import { audioState } from '../../audio'
import { SHIP_SPEED_LOUD_MULTIPLIER, SHIP_SPEED_QUIET_MULTIPLIER } from '../../constants'

export const calculateShipSpeedMultiplier = (): number =>
  SHIP_SPEED_QUIET_MULTIPLIER + (SHIP_SPEED_LOUD_MULTIPLIER - SHIP_SPEED_QUIET_MULTIPLIER) * audioState.sectionEnergy
