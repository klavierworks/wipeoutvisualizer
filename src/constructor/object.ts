import { DataTexture, Group, Mesh } from 'three'

import type { ObjectBundle, Vertex, WipeoutObject } from '../reader-bridge'
import type { Triangle } from './geometry'

import { buildGeometry } from './geometry'
import { createMaterials, sceneMaterialOptions } from './materials'
import { createPlumeNozzle } from './plume'
import { objectVertexTransform, polygonToTriangles } from './polygons'
import { constructSprite, isSprite } from './sprites'
import { createTextures } from './textures'

const plumeAnchors = (vertices: Vertex[]): Vertex[] => {
  if (vertices.length === 0) {
    return []
  }

  let minZ = vertices[0].z

  for (const vertex of vertices) {
    if (vertex.z < minZ) {
      minZ = vertex.z
    }
  }

  return vertices.filter((vertex) => vertex.z === minZ)
}

export type BuiltObject = {
  group: Group
  taggedIndices: Map<string, Uint32Array>
}

type ConstructOptions = {
  applyPlume?: boolean
  tagFor?: (polygonIndex: number) => string | undefined
}

export const buildObject = (object: WipeoutObject, textures: DataTexture[], options: ConstructOptions): BuiltObject => {
  const group = new Group()
  group.name = object.header.name
  group.position.set(object.header.position.x, -object.header.position.y, -object.header.position.z)

  const materials = createMaterials(textures, sceneMaterialOptions)

  const context = { textures, transform: objectVertexTransform, vertices: object.vertices }

  const triangles = object.polygons.flatMap((polygon, index) => {
    const tag = options.tagFor?.(index)
    const tris = polygonToTriangles(polygon, context)

    return tag ? tris.map((tri): Triangle => ({ ...tri, tag })) : tris
  })

  let taggedIndices = new Map<string, Uint32Array>()

  if (triangles.length > 0) {
    const built = buildGeometry(triangles)
    group.add(new Mesh(built.geometry, materials))
    taggedIndices = built.taggedIndices
  }

  for (const polygon of object.polygons) {
    if (isSprite(polygon)) {
      group.add(constructSprite(polygon, object.vertices, textures))
    }
  }

  if (options.applyPlume) {
    for (const anchor of plumeAnchors(object.vertices)) {
      for (const mesh of createPlumeNozzle(objectVertexTransform(anchor))) {
        group.add(mesh)
      }
    }
  }

  return { group, taggedIndices }
}

export const constructObjectBundle = (bundle: ObjectBundle, options: ConstructOptions = {}): Group => {
  const textures = createTextures(bundle.images)
  const group = new Group()

  for (const object of bundle.objects) {
    group.add(buildObject(object, textures, options).group)
  }

  return group
}
