import { Mesh } from 'three'
import type { TrackData, TrackFace, TrackTexture, TrackVertex } from '../reader-bridge'
import { u32ToRgb } from './color'
import { buildGeometry, Triangle } from './geometry'
import { createMaterials, trackMaterialOptions } from './materials'
import { createTextures } from './textures'
import { traverseSections } from './trackSpline'
import { composeTextures } from './trackTextures'

const QUAD_ORDER: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [2, 3, 0],
]

const TRACK_FACE_FLAG_FLIP = 4
const TRACK_FACE_FLAG_BOOST = 32
// Material index 3 in the track's material array holds the weapon-pickup tile.
// Matches the convention used by the original phobos viewer this is adapted from.
const WEAPON_TILE_INDEX = 3

const BOOST_TAG_PREFIX = 'boost:'
const WEAPON_TAG = 'weapon'

const trackVertex = (v: TrackVertex): [number, number, number] => [v.x, -v.y, -v.z]

const applyPerFaceTextures = (faces: TrackFace[], overrides: TrackTexture[]): TrackFace[] =>
  faces.map((face, i) => {
    const override = overrides[i]
    return override ? { ...face, tile: override.tile, flags: override.flags } : face
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
  (face.flags & TRACK_FACE_FLAG_BOOST) !== 0 ? [0.25, 0.25, 2] : u32ToRgb(face.color)

const faceToTriangles = (
  face: TrackFace,
  vertices: TrackVertex[],
  tag: string | undefined
): Triangle[] => {
  const uv = faceUv(face)
  const color = faceColor(face)
  return QUAD_ORDER.map((tri) => ({
    positions: [
      trackVertex(vertices[face.indices[tri[0]]]),
      trackVertex(vertices[face.indices[tri[1]]]),
      trackVertex(vertices[face.indices[tri[2]]]),
    ],
    uvs: [uv[tri[0]], uv[tri[1]], uv[tri[2]]],
    colors: [color, color, color],
    material: face.tile,
    tag,
  }))
}

export type BoostSection = {
  // Normalized arc-length center of this section along the spline.
  t: number
  indices: Uint32Array
}

export type BuiltTrack = {
  mesh: Mesh
  boostBaseColor: [number, number, number]
  boostSections: BoostSection[]
  // Lookup from section traversal index (0..numSections-1) to index in
  // boostSections, or -1 if the section isn't a boost section.
  boostSectionAt: Int32Array
  numSections: number
  weaponIndices: Uint32Array
}

export const constructTrack = (track: TrackData): BuiltTrack => {
  const composed = composeTextures(track.images, track.textureIndex)
  const textures = createTextures(composed)
  const materials = createMaterials(textures, trackMaterialOptions)

  const faces = applyPerFaceTextures(track.faces, track.textures)

  // Map each face to its section's position in traversal order. A boost
  // tag is suffixed with that traversal index so the geometry builder
  // collects per-section vertex buckets — needed for the per-ship
  // pass-over flash.
  const order = traverseSections(track)
  const numSections = order.length
  const traversalOf = new Int32Array(track.sections.length).fill(-1)
  order.forEach((origIdx, i) => {
    traversalOf[origIdx] = i
  })
  const sectionOfFace = new Int32Array(faces.length).fill(-1)
  for (let s = 0; s < track.sections.length; s++) {
    const section = track.sections[s]
    for (let f = section.first_face; f < section.first_face + section.num_faces; f++) {
      sectionOfFace[f] = s
    }
  }

  const tagFor = (face: TrackFace, fIdx: number): string | undefined => {
    const isBoost = (face.flags & TRACK_FACE_FLAG_BOOST) !== 0
    if (isBoost) {
      const sIdx = sectionOfFace[fIdx]
      const tIdx = sIdx >= 0 ? traversalOf[sIdx] : -1
      return tIdx >= 0 ? `${BOOST_TAG_PREFIX}${tIdx}` : undefined
    }
    if (face.tile === WEAPON_TILE_INDEX) return WEAPON_TAG
    return undefined
  }

  const triangles = faces.flatMap((face, fIdx) =>
    faceToTriangles(face, track.vertices, tagFor(face, fIdx))
  )
  const { geometry, taggedIndices } = buildGeometry(triangles)

  const mesh = new Mesh(geometry, materials)
  mesh.name = 'track'

  const boostSections: BoostSection[] = []
  const boostSectionAt = new Int32Array(numSections).fill(-1)
  for (let i = 0; i < numSections; i++) {
    const indices = taggedIndices.get(`${BOOST_TAG_PREFIX}${i}`)
    if (!indices || indices.length === 0) continue
    boostSectionAt[i] = boostSections.length
    boostSections.push({ t: i / numSections, indices })
  }

  return {
    mesh,
    // Mirrors the boost color baked by faceColor above; the runtime pulser
    // lerps from this toward a hot color on ship pass-over.
    boostBaseColor: [0.25, 0.25, 2],
    boostSections,
    boostSectionAt,
    numSections,
    weaponIndices: taggedIndices.get(WEAPON_TAG) ?? new Uint32Array(),
  }
}
