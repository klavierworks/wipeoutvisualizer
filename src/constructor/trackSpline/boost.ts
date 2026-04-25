import { CatmullRomCurve3, Vector3 } from 'three'

import type { TrackData, TrackFace, TrackSection, TrackVertex } from '../../reader-bridge'
import type { BoostRange } from './types'

import { TRACK_FACE_FLAG_BOOST, UP } from '../constants'

export const sectionBoostFaces = (section: TrackSection, faces: TrackFace[]): TrackFace[] => {
  const start = section.first_face
  const end = start + section.num_faces

  return faces.slice(start, end).filter((face) => (face.flags & TRACK_FACE_FLAG_BOOST) !== 0)
}

export const computeBoostFaceRanges = (
  curve: CatmullRomCurve3,
  boostFacesByOrder: TrackFace[][],
  vertices: TrackVertex[],
): BoostRange[][] => {
  const count = boostFacesByOrder.length
  const center = new Vector3()
  const tangent = new Vector3()
  const basisX = new Vector3()

  return boostFacesByOrder.map((faces, i) => {
    if (faces.length === 0) {
      return []
    }

    const t = i / count

    curve.getPointAt(t, center)
    curve.getTangentAt(t, tangent).normalize()
    basisX.crossVectors(UP, tangent).normalize()

    return faces.map((face) => {
      const lanes = face.indices.map((vertexIndex) => {
        const vertex = vertices[vertexIndex]
        const dx = vertex.x - center.x
        const dy = -vertex.y - center.y
        const dz = -vertex.z - center.z

        return dx * basisX.x + dy * basisX.y + dz * basisX.z
      })

      return { maxLane: Math.max(...lanes), minLane: Math.min(...lanes) }
    })
  })
}

export const buildBoostPulseByOriginal = (track: TrackData, primary: number[]): Int32Array => {
  const result = new Int32Array(track.sections.length).fill(-1)
  let pulse = 0

  for (const originalIndex of primary) {
    const section = track.sections[originalIndex]

    if (sectionBoostFaces(section, track.faces).length > 0) {
      result[originalIndex] = pulse
      pulse++
    }
  }

  return result
}

export const makeBoostPulseAt = (
  boostRanges: BoostRange[][],
  boostPulseAtSection: Int32Array,
): ((t: number, lane: number) => number) => {
  const count = boostRanges.length

  return (t, lane) => {
    if (count === 0) {
      return -1
    }

    const i = Math.floor((((t % 1) + 1) % 1) * count)
    const isHit = boostRanges[i].some((range) => lane >= range.minLane && lane <= range.maxLane)

    return isHit ? boostPulseAtSection[i] : -1
  }
}
