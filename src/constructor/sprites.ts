import { DataTexture, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
import type { Polygon, Vertex } from '../reader-bridge'
import { u32ToColor } from './color'
import { objectVertexTransform } from './polygons'

export type SpritePolygon = Extract<
  Polygon,
  { kind: 'sprite_top_anchor' } | { kind: 'sprite_bottom_anchor' }
>

export const isSprite = (polygon: Polygon): polygon is SpritePolygon =>
  polygon.kind === 'sprite_top_anchor' || polygon.kind === 'sprite_bottom_anchor'

const anchorOffset = (polygon: SpritePolygon): number =>
  polygon.kind === 'sprite_bottom_anchor' ? polygon.height / 2 : -polygon.height / 2

export const constructSprite = (
  polygon: SpritePolygon,
  vertices: Vertex[],
  textures: DataTexture[]
): Mesh => {
  const [x, y, z] = objectVertexTransform(vertices[polygon.index])
  const geometry = new PlaneGeometry(polygon.width, polygon.height)
  const material = new MeshBasicMaterial({
    map: textures[polygon.texture],
    color: u32ToColor(polygon.color),
    alphaTest: 0.5,
  })
  const mesh = new Mesh(geometry, material)
  mesh.position.set(x, y + anchorOffset(polygon), z)
  mesh.userData.isFacingCamera = true
  return mesh
}
