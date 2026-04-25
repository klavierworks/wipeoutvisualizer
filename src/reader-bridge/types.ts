export type DecodedImage = {
  height: number
  rgba: Uint8Array
  width: number
}

export type ExtrasData = {
  geometry: Record<string, ObjectBundle>
  textures: Record<string, DecodedImage[]>
}

export type ObjectBundle = {
  images: DecodedImage[]
  objects: WipeoutObject[]
}

export type ObjectHeader = {
  index1: number
  name: string
  origin: Vec3
  polygon_count: number
  position: Vec3
  vertex_count: number
}

export type Polygon =
  | { color: number; indices: number[]; kind: 'flat_quad_face_color'; subtype: number }
  | { color: number; indices: number[]; kind: 'flat_tris_face_color'; subtype: number }
  | {
      color: number
      height: number
      index: number
      kind: 'sprite_bottom_anchor'
      subtype: number
      texture: number
      width: number
    }
  | {
      color: number
      height: number
      index: number
      kind: 'sprite_top_anchor'
      subtype: number
      texture: number
      width: number
    }
  | {
      color: number
      indices: number[]
      kind: 'textured_quad_face_color'
      subtype: number
      texture: number
      uv: Uv[]
    }
  | {
      color: number
      indices: number[]
      kind: 'textured_tris_face_color'
      subtype: number
      texture: number
      uv: Uv[]
    }
  | { colors: number[]; indices: number[]; kind: 'flat_quad_vertex_color'; subtype: number }
  | { colors: number[]; indices: number[]; kind: 'flat_tris_vertex_color'; subtype: number }
  | {
      colors: number[]
      indices: number[]
      kind: 'textured_quad_vertex_color'
      subtype: number
      texture: number
      uv: Uv[]
    }
  | {
      colors: number[]
      indices: number[]
      kind: 'textured_tris_vertex_color'
      subtype: number
      texture: number
      uv: Uv[]
    }
  | { kind: 'unknown00'; subtype: number }

export type ReaderResult = {
  scene: ObjectBundle
  ships: ObjectBundle
  sky: ObjectBundle
  track: TrackData
}

export type TrackData = {
  faces: TrackFace[]
  images: DecodedImage[]
  sections: TrackSection[]
  textureIndex: TrackTextureIndex[]
  textures: TrackTexture[]
  vertices: TrackVertex[]
}

export type TrackFace = {
  color: number
  flags: number
  indices: number[]
  normal: number[]
  tile: number
}

export type TrackSection = {
  first_face: number
  flags: number
  next: number
  next_junction: number
  num_faces: number
  previous: number
  x: number
  y: number
  z: number
}

export type TrackTexture = {
  flags: number
  tile: number
}

export type TrackTextureIndex = {
  far: number[]
  med: number[]
  near: number[]
}

export type TrackVertex = { x: number; y: number; z: number }

export type Uv = { u: number; v: number }

export type Vec3 = { x: number; y: number; z: number }

export type Vertex = { x: number; y: number; z: number }

export type WipeoutObject = {
  header: ObjectHeader
  polygons: Polygon[]
  vertices: Vertex[]
}
