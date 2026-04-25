import { CatmullRomCurve3, Vector3 } from 'three'

import type { TrackData, TrackFace } from '../../reader-bridge'
import type { TrackSpline } from './types'

import { buildBoostPulseByOriginal, computeBoostFaceRanges, makeBoostPulseAt, sectionBoostFaces } from './boost'
import { computeLaneBounds } from './laneBounds'
import { sectionCenter, sectionNormal } from './normals'
import { fillMissing, smoothLoop } from './smoothing'

const SMOOTH_PASSES = 2

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

export const buildSplineFromOrder = (
  order: number[],
  track: TrackData,
  boostPulseByOriginal: Int32Array,
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

  return { boostPulseAt, curve, laneMax, laneMin, numSections: boostFacesByOrder.length, trackUp }
}

export { buildBoostPulseByOriginal }
