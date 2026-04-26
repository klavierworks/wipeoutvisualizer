import type { ExtractorFrame } from './createExtractor'

import {
  AVG_SMOOTH,
  KICK_FLOOR,
  KICK_FLOOR_FRACTION_OF_RMS,
  KICK_THRESHOLD,
  MIN_ONSET_INTERVAL_SEC,
  RUNNING_RMS_SMOOTH,
  SNARE_FLOOR,
  SNARE_FLOOR_FRACTION_OF_RMS,
  SNARE_THRESHOLD,
} from '../constants'
import { audioState } from '../state'

export type OnsetDetector = {
  handle: (frame: ExtractorFrame) => void
}

export type OnsetDetectorOptions = {
  useHardFloor: boolean
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const createOnsetDetector = ({ useHardFloor }: OnsetDetectorOptions): OnsetDetector => {
  let bassAverage = 0
  let trebleAverage = 0
  let runningRms = 0
  let lastKick = 0
  let lastSnare = 0
  let hasSeen = false

  return {
    handle: (frame) => {
      const { bands, rms, time } = frame

      if (!hasSeen) {
        bassAverage = bands.bass
        trebleAverage = bands.treble
        runningRms = rms
        hasSeen = true
      } else {
        bassAverage = lerp(bassAverage, bands.bass, AVG_SMOOTH)
        trebleAverage = lerp(trebleAverage, bands.treble, AVG_SMOOTH)
        runningRms = lerp(runningRms, rms, RUNNING_RMS_SMOOTH)
      }

      const kickRelative = runningRms * KICK_FLOOR_FRACTION_OF_RMS
      const snareRelative = runningRms * SNARE_FLOOR_FRACTION_OF_RMS
      const kickFloor = useHardFloor ? Math.max(KICK_FLOOR, kickRelative) : kickRelative
      const snareFloor = useHardFloor ? Math.max(SNARE_FLOOR, snareRelative) : snareRelative

      if (
        bands.bass > bassAverage * KICK_THRESHOLD &&
        bands.bass > kickFloor &&
        time - lastKick > MIN_ONSET_INTERVAL_SEC
      ) {
        audioState.kick = 1
        lastKick = time
      }

      if (
        bands.treble > trebleAverage * SNARE_THRESHOLD &&
        bands.treble > snareFloor &&
        time - lastSnare > MIN_ONSET_INTERVAL_SEC
      ) {
        audioState.snare = 1
        lastSnare = time
      }
    },
  }
}
