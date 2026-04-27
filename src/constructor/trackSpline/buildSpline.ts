import { CatmullRomCurve3, Vector3 } from 'three'

import type { TrackData, TrackFace } from '../../reader-bridge'
import type { TrackSpline } from './types'

import { buildBoostPulseByOriginal, computeBoostFaceRanges, makeBoostPulseAt, sectionBoostFaces } from './boost'
import { computeLaneBounds } from './laneBounds'
import { sectionCenter, sectionNormal } from './normals'
import { fillMissing, smoothLoop } from './smoothing'

// One pass of (prev + here + next) / 3 averaging on x and z. y is anchored
// to the canonical section center for every section (since fillMissing
// always finds one), so smoothing only damps lateral noise on straights —
// it can't pull the curve away from the surface on ramps/banked corners.
const SMOOTH_PASSES = 1

const packTrackUp = (normals: Vector3[]): Float32Array => {
  const out = new Float32Array(normals.length * 3)

  for (let i = 0; i < normals.length; i++) {
    out[i * 3] = normals[i].x
    out[i * 3 + 1] = normals[i].y
    out[i * 3 + 2] = normals[i].z
  }

  return out
}

const normalizeOrFallback = (normal: Vector3): Vector3 => {
  if (normal.lengthSq() < 1e-9) {
    return new Vector3(0, 1, 0)
  }

  return normal.clone().normalize()
}

const collectSectionData = (order: number[], track: TrackData) => {
  const rawCenters: (null | Vector3)[] = []
  const rawNormals: (null | Vector3)[] = []
  const boostFacesByOrder: TrackFace[][] = []

  for (const index of order) {
    const section = track.sections[index]

    rawCenters.push(sectionCenter(section, track.faces, track.vertices))
    rawNormals.push(sectionNormal(section, track.faces, track.vertices))
    boostFacesByOrder.push(sectionBoostFaces(section, track.faces))
  }

  return { boostFacesByOrder, rawCenters, rawNormals }
}

const Y_OUTLIER_THRESHOLD = 10000

export const logSectionYOutliers = (track: TrackData, order: number[]): void => {
  const ys = order.map((index) => -track.sections[index].y)
  const count = ys.length

  ys.forEach((here, i) => {
    const before = ys[(i - 1 + count) % count]
    const after = ys[(i + 1) % count]
    const expected = (before + after) / 2
    const delta = here - expected

    if (Math.abs(delta) <= Y_OUTLIER_THRESHOLD) {
      return
    }

    const sign = delta > 0 ? '+' : ''

    console.warn(
      `[spline] section ${order[i]} (order ${i}/${count}): y=${here.toFixed(0)}, neighbors avg ${expected.toFixed(0)} (${sign}${delta.toFixed(0)})`,
    )
  })
}

const computeStartLineT = (order: number[], startLineSection: number): number => {
  const position = order.indexOf(startLineSection)

  if (position < 0) {
    return 0
  }

  return position / order.length
}

export const buildSplineFromOrder = (
  order: number[],
  track: TrackData,
  boostPulseByOriginal: Int32Array,
  startLineSection: number,
): TrackSpline => {
  const { boostFacesByOrder, rawCenters, rawNormals } = collectSectionData(order, track)
  const boostPulseAtSection = new Int32Array(order.map((originalIndex) => boostPulseByOriginal[originalIndex]))

  const anchorY = rawCenters.map((center) => (center ? center.y : null))
  const points = smoothLoop(fillMissing(rawCenters), SMOOTH_PASSES, anchorY)
  const normals = fillMissing(rawNormals).map(normalizeOrFallback)
  const trackUp = packTrackUp(normals)

  const curve = new CatmullRomCurve3(points, true, 'centripetal')
  const { laneMax, laneMin } = computeLaneBounds(curve, points, order, track, trackUp)
  const boostRanges = computeBoostFaceRanges(curve, boostFacesByOrder, track.vertices)
  const boostPulseAt = makeBoostPulseAt(boostRanges, boostPulseAtSection)

  return {
    boostPulseAt,
    curve,
    laneMax,
    laneMin,
    numSections: boostFacesByOrder.length,
    order,
    startLineT: computeStartLineT(order, startLineSection),
    trackUp,
  }
}

export { buildBoostPulseByOriginal }
