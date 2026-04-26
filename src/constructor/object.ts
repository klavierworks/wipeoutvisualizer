import { DataTexture, Group, Mesh } from 'three'

import type { ObjectBundle, Polygon, Vertex, WipeoutObject } from '../reader-bridge'
import type { Triangle } from './geometry'

import { ENGINE_CLUSTER_RADIUS, ENGINE_TEXTURE_INDEX } from '../constants'
import { buildGeometry } from './geometry'
import { createMaterials, sceneMaterialOptions } from './materials'
import { createPlumeNozzle } from './plume'
import { objectVertexTransform, polygonToTriangles } from './polygons'
import { constructSprite, isSprite } from './sprites'
import { createTextures } from './textures'

type EnginePolygon = Extract<Polygon, { indices: number[]; texture: number }>

const isEnginePolygon = (polygon: Polygon): polygon is EnginePolygon =>
  'indices' in polygon && 'texture' in polygon && polygon.texture === ENGINE_TEXTURE_INDEX

const polygonCentroid = (polygon: EnginePolygon, vertices: Vertex[]): Vertex => {
  let sx = 0
  let sy = 0
  let sz = 0

  for (const index of polygon.indices) {
    sx += vertices[index].x
    sy += vertices[index].y
    sz += vertices[index].z
  }

  const count = polygon.indices.length

  return { x: sx / count, y: sy / count, z: sz / count }
}

const clusterAnchors = (centroids: Vertex[], radius: number): Vertex[] => {
  const r2 = radius * radius
  const clusters: { count: number; sum: Vertex }[] = []

  for (const centroid of centroids) {
    const merged = clusters.find((cluster) => {
      const cx = cluster.sum.x / cluster.count
      const cy = cluster.sum.y / cluster.count
      const cz = cluster.sum.z / cluster.count
      const dx = centroid.x - cx
      const dy = centroid.y - cy
      const dz = centroid.z - cz

      return dx * dx + dy * dy + dz * dz < r2
    })

    if (merged) {
      merged.sum.x += centroid.x
      merged.sum.y += centroid.y
      merged.sum.z += centroid.z
      merged.count += 1
    } else {
      clusters.push({ count: 1, sum: { ...centroid } })
    }
  }

  return clusters.map((cluster) => ({
    x: cluster.sum.x / cluster.count,
    y: cluster.sum.y / cluster.count,
    z: cluster.sum.z / cluster.count,
  }))
}

const minZAnchors = (vertices: Vertex[]): Vertex[] => {
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

const plumeAnchors = (object: WipeoutObject): Vertex[] => {
  const engineCentroids = object.polygons
    .filter(isEnginePolygon)
    .map((polygon) => polygonCentroid(polygon, object.vertices))

  if (engineCentroids.length > 0) {
    return clusterAnchors(engineCentroids, ENGINE_CLUSTER_RADIUS)
  }

  return minZAnchors(object.vertices)
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
    for (const anchor of plumeAnchors(object)) {
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
