export type DecodedImage = {
  width: number
  height: number
  rgba: Uint8Array
}

export type Vec3 = { x: number; y: number; z: number }

export type Vertex = { x: number; y: number; z: number }

export type Uv = { u: number; v: number }

export type ObjectHeader = {
  name: string
  vertex_count: number
  polygon_count: number
  index1: number
  origin: Vec3
  position: Vec3
}

export type Polygon =
  | { kind: 'unknown00'; subtype: number }
  | { kind: 'flat_tris_face_color'; subtype: number; indices: number[]; color: number }
  | { kind: 'textured_tris_face_color'; subtype: number; indices: number[]; texture: number; uv: Uv[]; color: number }
  | { kind: 'flat_quad_face_color'; subtype: number; indices: number[]; color: number }
  | { kind: 'textured_quad_face_color'; subtype: number; indices: number[]; texture: number; uv: Uv[]; color: number }
  | { kind: 'flat_tris_vertex_color'; subtype: number; indices: number[]; colors: number[] }
  | { kind: 'textured_tris_vertex_color'; subtype: number; indices: number[]; texture: number; uv: Uv[]; colors: number[] }
  | { kind: 'flat_quad_vertex_color'; subtype: number; indices: number[]; colors: number[] }
  | { kind: 'textured_quad_vertex_color'; subtype: number; indices: number[]; texture: number; uv: Uv[]; colors: number[] }
  | { kind: 'sprite_top_anchor'; subtype: number; index: number; width: number; height: number; texture: number; color: number }
  | { kind: 'sprite_bottom_anchor'; subtype: number; index: number; width: number; height: number; texture: number; color: number }

export type WipeoutObject = {
  header: ObjectHeader
  vertices: Vertex[]
  polygons: Polygon[]
}

export type TrackVertex = { x: number; y: number; z: number }

export type TrackFace = {
  indices: number[]
  normal: number[]
  tile: number
  flags: number
  color: number
}

export type TrackSection = {
  next_junction: number
  previous: number
  next: number
  x: number
  y: number
  z: number
  first_face: number
  num_faces: number
  flags: number
}

export type TrackTextureIndex = {
  near: number[]
  med: number[]
  far: number[]
}

export type TrackTexture = {
  tile: number
  flags: number
}

export type TrackData = {
  vertices: TrackVertex[]
  faces: TrackFace[]
  sections: TrackSection[]
  textures: TrackTexture[]
  textureIndex: TrackTextureIndex[]
  images: DecodedImage[]
}

export type ObjectBundle = {
  objects: WipeoutObject[]
  images: DecodedImage[]
}

export type ReaderResult = {
  scene: ObjectBundle
  sky: ObjectBundle
  ships: ObjectBundle
  track: TrackData
}

export type ExtrasData = {
  geometry: Record<string, ObjectBundle>
  textures: Record<string, DecodedImage[]>
}
