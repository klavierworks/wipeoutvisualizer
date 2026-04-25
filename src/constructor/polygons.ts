import type { DataTexture } from 'three'

import type { Polygon, Uv, Vertex } from '../reader-bridge'
import type { Triangle } from './geometry'

import { u32ToRgb } from './color'
import { QUAD_ORDER, TRI_ORDER } from './constants'

export type VertexTransform = (vertex: Vertex) => [number, number, number]

export const objectVertexTransform: VertexTransform = (vertex) => [vertex.x, -vertex.y, -vertex.z]

const scaleUv = (uv: Uv, texture: DataTexture | undefined): [number, number] => {
  if (!texture) {
    return [0, 0]
  }

  const image = texture.image as { height: number; width: number }

  return [uv.u / image.width, uv.v / image.height]
}

const materialFor = (polygonTexture: number | undefined, textureCount: number): number =>
  polygonTexture !== undefined && polygonTexture < textureCount ? polygonTexture : textureCount

const zeroUv = (): [number, number] => [0, 0]

type EmitContext = {
  textures: DataTexture[]
  transform: VertexTransform
  vertices: Vertex[]
}

export const polygonToTriangles = (polygon: Polygon, context: EmitContext): Triangle[] => {
  const { textures, transform, vertices } = context
  const textureCount = textures.length

  switch (polygon.kind) {
    case 'flat_quad_face_color':
      return emitTris(
        polygon.indices,
        QUAD_ORDER,
        (i) => transform(vertices[polygon.indices[i]]),
        () => zeroUv(),
        () => u32ToRgb(polygon.color),
        materialFor(undefined, textureCount),
      )

    case 'flat_quad_vertex_color':
      return emitTris(
        polygon.indices,
        QUAD_ORDER,
        (i) => transform(vertices[polygon.indices[i]]),
        () => zeroUv(),
        (i) => u32ToRgb(polygon.colors[i]),
        materialFor(undefined, textureCount),
      )

    case 'flat_tris_face_color':
      return emitTris(
        polygon.indices,
        TRI_ORDER,
        (i) => transform(vertices[polygon.indices[i]]),
        () => zeroUv(),
        () => u32ToRgb(polygon.color),
        materialFor(undefined, textureCount),
      )

    case 'flat_tris_vertex_color':
      return emitTris(
        polygon.indices,
        TRI_ORDER,
        (i) => transform(vertices[polygon.indices[i]]),
        () => zeroUv(),
        (i) => u32ToRgb(polygon.colors[i]),
        materialFor(undefined, textureCount),
      )

    case 'textured_quad_face_color':
      return emitTris(
        polygon.indices,
        QUAD_ORDER,
        (i) => transform(vertices[polygon.indices[i]]),
        (i) => scaleUv(polygon.uv[i], textures[polygon.texture]),
        () => u32ToRgb(polygon.color),
        materialFor(polygon.texture, textureCount),
      )

    case 'textured_quad_vertex_color':
      return emitTris(
        polygon.indices,
        QUAD_ORDER,
        (i) => transform(vertices[polygon.indices[i]]),
        (i) => scaleUv(polygon.uv[i], textures[polygon.texture]),
        (i) => u32ToRgb(polygon.colors[i]),
        materialFor(polygon.texture, textureCount),
      )

    case 'textured_tris_face_color':
      return emitTris(
        polygon.indices,
        TRI_ORDER,
        (i) => transform(vertices[polygon.indices[i]]),
        (i) => scaleUv(polygon.uv[i], textures[polygon.texture]),
        () => u32ToRgb(polygon.color),
        materialFor(polygon.texture, textureCount),
      )

    case 'textured_tris_vertex_color':
      return emitTris(
        polygon.indices,
        TRI_ORDER,
        (i) => transform(vertices[polygon.indices[i]]),
        (i) => scaleUv(polygon.uv[i], textures[polygon.texture]),
        (i) => u32ToRgb(polygon.colors[i]),
        materialFor(polygon.texture, textureCount),
      )

    default:
      return []
  }
}

const emitTris = (
  indices: number[],
  order: readonly (readonly [number, number, number])[],
  position: (localIndex: number) => [number, number, number],
  uv: (localIndex: number) => [number, number],
  color: (localIndex: number) => [number, number, number],
  material: number,
): Triangle[] =>
  order
    .filter((tri) => tri.every((index) => index < indices.length))
    .map((tri) => ({
      colors: [color(tri[0]), color(tri[1]), color(tri[2])],
      material,
      positions: [position(tri[0]), position(tri[1]), position(tri[2])],
      sourceIndices: [indices[tri[0]], indices[tri[1]], indices[tri[2]]],
      uvs: [uv(tri[0]), uv(tri[1]), uv(tri[2])],
    }))
