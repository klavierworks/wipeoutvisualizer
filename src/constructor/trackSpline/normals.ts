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

export const sectionCenter = (section: TrackSection, faces: TrackFace[], vertices: TrackVertex[]): null | Vector3 => {
  const position = new Vector3()
  let count = 0

  for (let i = section.first_face; i < section.first_face + section.num_faces; i++) {
    const face = faces[i]

    if ((face.flags & TRACK_FACE_FLAG_TRACK) === 0) {
      continue
    }

    for (const vertexIndex of face.indices) {
      const vertex = vertices[vertexIndex]

      position.x += vertex.x
      position.y += -vertex.y
      position.z += -vertex.z
      count++
    }
  }

  return count > 0 ? position.divideScalar(count) : null
}
