import { Vector3 } from 'three'

import type { TrackFace, TrackSection, TrackVertex } from '../../reader-bridge'

import { TRACK_FACE_FLAG_TRACK } from '../constants'

const triangleNormal = (v0: TrackVertex, v1: TrackVertex, v2: TrackVertex): null | Vector3 => {
  const edge1 = new Vector3(v1.x - v0.x, -(v1.y - v0.y), -(v1.z - v0.z))
  const edge2 = new Vector3(v2.x - v0.x, -(v2.y - v0.y), -(v2.z - v0.z))
  const normal = new Vector3().crossVectors(edge1, edge2)
  const length = normal.length()

  if (length < 1e-9) {
    return null
  }

  return normal.divideScalar(length)
}

export const sectionNormal = (section: TrackSection, faces: TrackFace[], vertices: TrackVertex[]): null | Vector3 => {
  const accumulator = new Vector3()
  let count = 0

  for (let i = section.first_face; i < section.first_face + section.num_faces; i++) {
    const face = faces[i]

    if ((face.flags & TRACK_FACE_FLAG_TRACK) === 0 || face.indices.length < 3) {
      continue
    }

    const normal = triangleNormal(vertices[face.indices[0]], vertices[face.indices[1]], vertices[face.indices[2]])

    if (!normal) {
      continue
    }

    const sign = normal.y < 0 ? -1 : 1

    accumulator.addScaledVector(normal, sign)
    count++
  }

  if (count === 0) {
    return null
  }

  accumulator.divideScalar(count)

  if (accumulator.lengthSq() < 1e-9) {
    return new Vector3(0, 1, 0)
  }

  return accumulator.normalize()
}

// x/z come from the canonical TRS waypoint (clean racing line, free of the
// vertex-count bias of a centroid). y comes from the centroid of track-flagged
// face vertices so the spline sits at a fixed offset above the actual surface
// — using section.y here puts the spline at the section's bbox / waypoint
// height, which on tracks with tall walls or tunnels can be far from the
// drivable surface. Falls back to canonical section.y when a section has no
// track faces (a gap) — flight ballistics carry the ship across the dip.
export const sectionCenter = (section: TrackSection, faces: TrackFace[], vertices: TrackVertex[]): Vector3 => {
  let ySum = 0
  let count = 0

  for (let i = section.first_face; i < section.first_face + section.num_faces; i++) {
    const face = faces[i]

    if ((face.flags & TRACK_FACE_FLAG_TRACK) === 0) {
      continue
    }

    for (const vertexIndex of face.indices) {
      ySum += -vertices[vertexIndex].y
      count++
    }
  }

  const y = count > 0 ? ySum / count : -section.y

  return new Vector3(section.x, y, -section.z)
}
