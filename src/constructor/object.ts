import { DataTexture, Group, Mesh } from 'three'
import type { WipeoutObject, ObjectBundle, Vertex } from '../reader-bridge'
import { buildGeometry } from './geometry'
import { createMaterials, sceneMaterialOptions } from './materials'
import { createPlumeMesh } from './plume'
import { objectVertexTransform, polygonToTriangles } from './polygons'
import { constructSprite, isSprite } from './sprites'
import { createTextures } from './textures'

// WipEout 1 tagged exhaust tris with the `PRM_SHIP_ENGINE = 0x02` polygon flag
// (phoboslab/wipeout-rewrite ship.c:271-396). WipEout 2097's TERRY.PRM does
// NOT use that convention — every polygon is subtype 0x0001 — so we fall back
// to a geometric heuristic. In PRM local space, ship +Z is the nose and -Z
// is the tail, and each ship has 2–6 verts sitting at the minimum Z coord:
// those are the nozzle anchor points. We use them to place separate plume
// geometry as children of the ship group — no mesh deformation — so plumes
// render cleanly regardless of how the PRM's rear fuselage is triangulated.
const plumeAnchors = (vertices: Vertex[]): Vertex[] => {
  if (vertices.length === 0) return []
  let minZ = vertices[0].z
  for (const v of vertices) {
    if (v.z < minZ) minZ = v.z
  }
  return vertices.filter((v) => v.z === minZ)
}

type ConstructOptions = {
  // When true, adds a glowing plume mesh at each detected nozzle anchor.
  // Set only for ship bundles — other objects' rear verts aren't nozzles.
  applyPlume?: boolean
}

const constructOne = (
  object: WipeoutObject,
  textures: DataTexture[],
  options: ConstructOptions,
): Group => {
  const group = new Group()
  group.name = object.header.name
  group.position.set(object.header.position.x, -object.header.position.y, -object.header.position.z)

  const materials = createMaterials(textures, sceneMaterialOptions)
  const context = { vertices: object.vertices, transform: objectVertexTransform, textures }
  const triangles = object.polygons.flatMap((p) => polygonToTriangles(p, context))

  if (triangles.length > 0) {
    group.add(new Mesh(buildGeometry(triangles).geometry, materials))
  }

  for (const polygon of object.polygons) {
    if (isSprite(polygon)) {
      group.add(constructSprite(polygon, object.vertices, textures))
    }
  }

  if (options.applyPlume) {
    for (const anchor of plumeAnchors(object.vertices)) {
      group.add(createPlumeMesh(objectVertexTransform(anchor)))
    }
  }

  return group
}

export const constructObjectBundle = (
  bundle: ObjectBundle,
  options: ConstructOptions = {},
): Group => {
  const textures = createTextures(bundle.images)
  const group = new Group()
  for (const object of bundle.objects) {
    group.add(constructOne(object, textures, options))
  }
  return group
}
