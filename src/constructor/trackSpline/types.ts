import type { CatmullRomCurve3 } from 'three'

export type BoostRange = { maxLane: number; minLane: number }

export type TrackSpline = {
  boostPulseAt: (t: number, lane: number) => number
  curve: CatmullRomCurve3
  laneMax: Float32Array
  laneMin: Float32Array
  numSections: number
  trackUp: Float32Array
}
