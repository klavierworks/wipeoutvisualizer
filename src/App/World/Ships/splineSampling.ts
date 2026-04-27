import type { Vector3 } from 'three'

import type { TrackSpline } from '../../../constructor/trackSpline'
import type { RacerConfig } from './racerConfig'

import { TWO_PI, WALL_PADDING } from '../../../constants'

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export type LaneSample = {
  clamped: number
  desired: number
  innerMax: number
  innerMin: number
}

export const splineLane = (
  spline: TrackSpline,
  t: number,
  config: RacerConfig,
  startLaneFade: number,
  laneAdjust = 0,
): LaneSample => {
  // Cross-fade between the pre-race grid lane and the in-race swerve as
  // startLaneFade ramps 0 → 1 after the gantry turns green. Without the
  // blend, swerve would snap from 0 to its instantaneous sine value at green
  // (a visible lateral jump), and config.startLane would keep dragging ships
  // out to the wide start grid forever, ruining the race line.
  const swerve = Math.sin(t * config.laneFrequency * TWO_PI + config.lanePhase) * config.laneAmplitude
  const desired = config.startLane * (1 - startLaneFade) + swerve * startLaneFade + laneAdjust
  const param = (((t % 1) + 1) % 1) * spline.numSections
  const i0 = Math.floor(param) % spline.numSections
  const i1 = (i0 + 1) % spline.numSections
  const frac = param - Math.floor(param)
  const innerMin = spline.laneMin[i0] * (1 - frac) + spline.laneMin[i1] * frac + WALL_PADDING
  const innerMax = spline.laneMax[i0] * (1 - frac) + spline.laneMax[i1] * frac - WALL_PADDING

  return { clamped: clamp(desired, innerMin, innerMax), desired, innerMax, innerMin }
}

export const sampleTrackUp = (spline: TrackSpline, t: number, out: Vector3): void => {
  const param = (((t % 1) + 1) % 1) * spline.numSections
  const i0 = Math.floor(param) % spline.numSections
  const i1 = (i0 + 1) % spline.numSections
  const frac = param - Math.floor(param)
  const x = spline.trackUp[i0 * 3] * (1 - frac) + spline.trackUp[i1 * 3] * frac
  const y = spline.trackUp[i0 * 3 + 1] * (1 - frac) + spline.trackUp[i1 * 3 + 1] * frac
  const z = spline.trackUp[i0 * 3 + 2] * (1 - frac) + spline.trackUp[i1 * 3 + 2] * frac
  const len = Math.sqrt(x * x + y * y + z * z) || 1
  out.set(x / len, y / len, z / len)
}
