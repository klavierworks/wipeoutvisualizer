import type { CatmullRomCurve3 } from 'three'

export type BoostRange = { maxLane: number; minLane: number }

export type TrackSpline = {
  boostPulseAt: (t: number, lane: number) => number
  curve: CatmullRomCurve3
  laneMax: Float32Array
  laneMin: Float32Array
  numSections: number
  // Original TRS section indices in spline-traversal order. order[i] is the
  // raw section index at spline position i; mirrors the array the
  // start-line lookup uses to compute startLineT.
  order: number[]
  // Spline parameter (0..1) of the start line. Computed from the track's
  // start_line_pos (source section index) by mapping it through this
  // spline's section order. 0 if the start-line section is not on this
  // spline (alternates that don't pass through it).
  startLineT: number
  trackUp: Float32Array
}
