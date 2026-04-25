import { Mesh } from 'three'

import type { TrackData, TrackFace, TrackTexture, TrackVertex } from '../reader-bridge'

import { u32ToRgb } from './color'
import {
  BOOST_TAG_PREFIX,
  TRACK_BOOST_BASE_COLOR,
  TRACK_FACE_FLAG_BOOST,
  TRACK_FACE_FLAG_FLIP,
  TRACK_QUAD_ORDER,
  WEAPON_TAG,
  WEAPON_TILE_INDEX,
} from './constants'
import { buildGeometry, Triangle } from './geometry'
import { createMaterials, trackMaterialOptions } from './materials'
import { createTextures } from './textures'
import { traverseSections } from './trackSpline'
import { composeTextures } from './trackTextures'

const trackVertex = (vertex: TrackVertex): [number, number, number] => [vertex.x, -vertex.y, -vertex.z]

const applyPerFaceTextures = (faces: TrackFace[], overrides: TrackTexture[]): TrackFace[] =>
  faces.map((face, i) => {
    const override = overrides[i]

    return override ? { ...face, flags: override.flags, tile: override.tile } : face
  })

const faceUv = (face: TrackFace): [number, number][] => {
  const flip = (face.flags & TRACK_FACE_FLAG_FLIP) !== 0 ? 1 : 0

  return [
    [1 - flip, 1],
    [flip, 1],
    [flip, 0],
    [1 - flip, 0],
  ]
}

const faceColor = (face: TrackFace): [number, number, number] =>
  (face.flags & TRACK_FACE_FLAG_BOOST) !== 0 ? TRACK_BOOST_BASE_COLOR : u32ToRgb(face.color)

const faceToTriangles = (face: TrackFace, vertices: TrackVertex[], tag: string | undefined): Triangle[] => {
  const uv = faceUv(face)
  const color = faceColor(face)

  return TRACK_QUAD_ORDER.map((tri) => ({
    colors: [color, color, color],
    material: face.tile,
    positions: [
      trackVertex(vertices[face.indices[tri[0]]]),
      trackVertex(vertices[face.indices[tri[1]]]),
      trackVertex(vertices[face.indices[tri[2]]]),
    ],
    tag,
    uvs: [uv[tri[0]], uv[tri[1]], uv[tri[2]]],
  }))
}

export type BoostSection = {
  indices: Uint32Array
  t: number
}

export type BuiltTrack = {
  boostBaseColor: [number, number, number]
  boostSections: BoostSection[]
  mesh: Mesh
  weaponIndices: Uint32Array
}

export const constructTrack = (track: TrackData): BuiltTrack => {
  const composed = composeTextures(track.images, track.textureIndex)
  const textures = createTextures(composed)
  const materials = createMaterials(textures, trackMaterialOptions)

  const faces = applyPerFaceTextures(track.faces, track.textures)

  const order = traverseSections(track)
  const numSections = order.length
  const traversalOf = new Int32Array(track.sections.length).fill(-1)

  order.forEach((originalIndex, i) => {
    traversalOf[originalIndex] = i
  })

  const sectionOfFace = new Int32Array(faces.length).fill(-1)

  for (let s = 0; s < track.sections.length; s++) {
    const section = track.sections[s]

    for (let f = section.first_face; f < section.first_face + section.num_faces; f++) {
      sectionOfFace[f] = s
    }
  }

  const tagFor = (face: TrackFace, faceIndex: number): string | undefined => {
    const isBoost = (face.flags & TRACK_FACE_FLAG_BOOST) !== 0

    if (isBoost) {
      const sectionIndex = sectionOfFace[faceIndex]
      const traversalIndex = sectionIndex >= 0 ? traversalOf[sectionIndex] : -1

      return traversalIndex >= 0 ? `${BOOST_TAG_PREFIX}${traversalIndex}` : undefined
    }

    if (face.tile === WEAPON_TILE_INDEX) {
      return WEAPON_TAG
    }

    return undefined
  }

  const triangles = faces.flatMap((face, faceIndex) => faceToTriangles(face, track.vertices, tagFor(face, faceIndex)))

  const { geometry, taggedIndices } = buildGeometry(triangles)

  const mesh = new Mesh(geometry, materials)
  mesh.name = 'track'

  const boostSections: BoostSection[] = []

  for (let i = 0; i < numSections; i++) {
    const indices = taggedIndices.get(`${BOOST_TAG_PREFIX}${i}`)

    if (!indices || indices.length === 0) {
      continue
    }

    boostSections.push({ indices, t: i / numSections })
  }

  return {
    boostBaseColor: TRACK_BOOST_BASE_COLOR,
    boostSections,
    mesh,
    weaponIndices: taggedIndices.get(WEAPON_TAG) ?? new Uint32Array(),
  }
}
