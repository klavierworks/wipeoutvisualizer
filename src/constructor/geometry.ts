import { BufferAttribute, BufferGeometry } from 'three'

export type Triangle = {
  positions: [number, number, number][]
  uvs: [number, number][]
  colors: [number, number, number][]
  material: number
  // Optional tag — tagged triangles' final vertex indices are collected so
  // callers can mutate the color buffer for those verts at runtime.
  tag?: string
  // Original PRM vertex indices (one per corner). Threaded through for
  // callers that need to map buffer slots back to source verts (e.g. to
  // anchor separate plume geometry at specific nozzle verts).
  sourceIndices?: [number, number, number]
}

export type GeometryBuild = {
  geometry: BufferGeometry
  taggedIndices: Map<string, Uint32Array>
}

export const buildGeometry = (triangles: Triangle[]): GeometryBuild => {
  const byMaterial = new Map<number, Triangle[]>()
  for (const tri of triangles) {
    const bucket = byMaterial.get(tri.material) ?? []
    bucket.push(tri)
    byMaterial.set(tri.material, bucket)
  }

  const ordered = [...byMaterial.entries()].sort(([a], [b]) => a - b)
  const total = triangles.length * 3

  const positions = new Float32Array(total * 3)
  const uvs = new Float32Array(total * 2)
  const colors = new Float32Array(total * 3)
  // Per-triangle morph attributes. All three vertices of a triangle share the
  // same triCenter, flyDir and triSeed so the warp shader can explode each
  // triangle as a rigid body outward from the mesh center.
  const triCenters = new Float32Array(total * 3)
  const flyDirs = new Float32Array(total * 3)
  const triSeeds = new Float32Array(total)

  const geometry = new BufferGeometry()
  const tagLists = new Map<string, number[]>()
  let cursor = 0
  for (const [material, tris] of ordered) {
    const start = cursor
    for (const tri of tris) {
      if (tri.tag) {
        const list = tagLists.get(tri.tag) ?? []
        list.push(cursor, cursor + 1, cursor + 2)
        tagLists.set(tri.tag, list)
      }
      const cx = (tri.positions[0][0] + tri.positions[1][0] + tri.positions[2][0]) / 3
      const cy = (tri.positions[0][1] + tri.positions[1][1] + tri.positions[2][1]) / 3
      const cz = (tri.positions[0][2] + tri.positions[1][2] + tri.positions[2][2]) / 3
      const seed = Math.random()
      for (let i = 0; i < 3; i++) {
        positions.set(tri.positions[i], cursor * 3)
        uvs.set(tri.uvs[i], cursor * 2)
        colors.set(tri.colors[i], cursor * 3)
        triCenters[cursor * 3] = cx
        triCenters[cursor * 3 + 1] = cy
        triCenters[cursor * 3 + 2] = cz
        triSeeds[cursor] = seed
        cursor++
      }
    }
    geometry.addGroup(start, cursor - start, material)
  }

  // flyDir = normalize(triCenter - meshCenter). Fall back to +Y for degenerate
  // cases where the triangle sits right on the mesh center.
  let mcx = 0
  let mcy = 0
  let mcz = 0
  for (let i = 0; i < total; i++) {
    mcx += triCenters[i * 3]
    mcy += triCenters[i * 3 + 1]
    mcz += triCenters[i * 3 + 2]
  }
  mcx /= total
  mcy /= total
  mcz /= total
  for (let i = 0; i < total; i++) {
    const dx = triCenters[i * 3] - mcx
    const dy = triCenters[i * 3 + 1] - mcy
    const dz = triCenters[i * 3 + 2] - mcz
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (len > 1e-4) {
      flyDirs[i * 3] = dx / len
      flyDirs[i * 3 + 1] = dy / len
      flyDirs[i * 3 + 2] = dz / len
    } else {
      flyDirs[i * 3] = 0
      flyDirs[i * 3 + 1] = 1
      flyDirs[i * 3 + 2] = 0
    }
  }

  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.setAttribute('aTriCenter', new BufferAttribute(triCenters, 3))
  geometry.setAttribute('aFlyDir', new BufferAttribute(flyDirs, 3))
  geometry.setAttribute('aTriSeed', new BufferAttribute(triSeeds, 1))
  geometry.computeVertexNormals()

  const taggedIndices = new Map<string, Uint32Array>()
  for (const [tag, indices] of tagLists) taggedIndices.set(tag, new Uint32Array(indices))

  return { geometry, taggedIndices }
}
