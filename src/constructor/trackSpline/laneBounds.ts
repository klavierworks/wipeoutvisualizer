import { CatmullRomCurve3, Vector3 } from 'three'

import type { TrackData } from '../../reader-bridge'

import { TRACK_FACE_FLAG_TRACK } from '../constants'
import { interpolateAroundLoop } from './smoothing'

const sectionLaneRange = (
  track: TrackData,
  sectionIndex: number,
  center: Vector3,
  basisX: Vector3,
): null | { max: number; min: number } => {
  const section = track.sections[sectionIndex]
  let min = Infinity
  let max = -Infinity

  for (let faceIndex = section.first_face; faceIndex < section.first_face + section.num_faces; faceIndex++) {
    const face = track.faces[faceIndex]

    if ((face.flags & TRACK_FACE_FLAG_TRACK) === 0) {
      continue
    }

    for (const vertexIndex of face.indices) {
      const vertex = track.vertices[vertexIndex]
      const dx = vertex.x - center.x
      const dy = -vertex.y - center.y
      const dz = -vertex.z - center.z
      const lane = dx * basisX.x + dy * basisX.y + dz * basisX.z

      if (lane < min) {
        min = lane
      }

      if (lane > max) {
        max = lane
      }
    }
  }

  if (min === Infinity) {
    return null
  }

  return { max, min }
}

export const computeLaneBounds = (
  curve: CatmullRomCurve3,
  centers: Vector3[],
  order: number[],
  track: TrackData,
  trackUp: Float32Array,
): { laneMax: Float32Array; laneMin: Float32Array } => {
  const count = order.length
  const laneMin = new Float32Array(count)
  const laneMax = new Float32Array(count)
  const valid: boolean[] = new Array(count).fill(false)
  const tangent = new Vector3()
  const basisX = new Vector3()

  for (let i = 0; i < count; i++) {
    curve.getTangentAt(i / count, tangent).normalize()

    const upX = trackUp[i * 3]
    const upY = trackUp[i * 3 + 1]
    const upZ = trackUp[i * 3 + 2]

    basisX
      .set(upY * tangent.z - upZ * tangent.y, upZ * tangent.x - upX * tangent.z, upX * tangent.y - upY * tangent.x)
      .normalize()

    const range = sectionLaneRange(track, order[i], centers[i], basisX)

    if (range) {
      laneMin[i] = range.min
      laneMax[i] = range.max
      valid[i] = true
    }
  }

  for (let i = 0; i < count; i++) {
    if (valid[i]) {
      continue
    }

    const filled = interpolateAroundLoop<{ max: number; min: number }>(
      valid,
      i,
      (validIndex) => ({ max: laneMax[validIndex], min: laneMin[validIndex] }),
      (before, after, t) => ({ max: before.max * (1 - t) + after.max * t, min: before.min * (1 - t) + after.min * t }),
      () => ({ max: 1e6, min: -1e6 }),
    )

    laneMin[i] = filled.min
    laneMax[i] = filled.max
  }

  return { laneMax, laneMin }
}
