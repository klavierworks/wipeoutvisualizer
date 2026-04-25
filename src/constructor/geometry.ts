import { BufferAttribute, BufferGeometry } from 'three'

export type GeometryBuild = {
  geometry: BufferGeometry
  taggedIndices: Map<string, Uint32Array>
}

export type Triangle = {
  colors: [number, number, number][]
  material: number
  positions: [number, number, number][]
  sourceIndices?: [number, number, number]
  tag?: string
  uvs: [number, number][]
}

type Buffers = {
  colors: Float32Array
  flyDirs: Float32Array
  positions: Float32Array
  triCenters: Float32Array
  triSeeds: Float32Array
  uvs: Float32Array
}

const allocateBuffers = (vertexCount: number): Buffers => ({
  colors: new Float32Array(vertexCount * 3),
  flyDirs: new Float32Array(vertexCount * 3),
  positions: new Float32Array(vertexCount * 3),
  triCenters: new Float32Array(vertexCount * 3),
  triSeeds: new Float32Array(vertexCount),
  uvs: new Float32Array(vertexCount * 2),
})

const bucketByMaterial = (triangles: Triangle[]): [number, Triangle[]][] => {
  const byMaterial = new Map<number, Triangle[]>()

  for (const triangle of triangles) {
    const bucket = byMaterial.get(triangle.material) ?? []

    bucket.push(triangle)
    byMaterial.set(triangle.material, bucket)
  }

  return [...byMaterial.entries()].sort(([a], [b]) => a - b)
}

const triangleCenter = (triangle: Triangle): [number, number, number] => [
  (triangle.positions[0][0] + triangle.positions[1][0] + triangle.positions[2][0]) / 3,
  (triangle.positions[0][1] + triangle.positions[1][1] + triangle.positions[2][1]) / 3,
  (triangle.positions[0][2] + triangle.positions[1][2] + triangle.positions[2][2]) / 3,
]

const writeTriangleVertices = (buffers: Buffers, triangle: Triangle, cursor: number): void => {
  const [centerX, centerY, centerZ] = triangleCenter(triangle)
  const seed = Math.random()

  for (let i = 0; i < 3; i++) {
    const vertex = cursor + i

    buffers.positions.set(triangle.positions[i], vertex * 3)
    buffers.uvs.set(triangle.uvs[i], vertex * 2)
    buffers.colors.set(triangle.colors[i], vertex * 3)
    buffers.triCenters[vertex * 3] = centerX
    buffers.triCenters[vertex * 3 + 1] = centerY
    buffers.triCenters[vertex * 3 + 2] = centerZ
    buffers.triSeeds[vertex] = seed
  }
}

const packAttributes = (
  buckets: [number, Triangle[]][],
  buffers: Buffers,
  geometry: BufferGeometry,
): Map<string, number[]> => {
  const tagLists = new Map<string, number[]>()
  let cursor = 0

  for (const [material, triangles] of buckets) {
    const start = cursor

    for (const triangle of triangles) {
      if (triangle.tag) {
        const list = tagLists.get(triangle.tag) ?? []

        list.push(cursor, cursor + 1, cursor + 2)
        tagLists.set(triangle.tag, list)
      }

      writeTriangleVertices(buffers, triangle, cursor)
      cursor += 3
    }

    geometry.addGroup(start, cursor - start, material)
  }

  return tagLists
}

const computeMeanCenter = (centers: Float32Array, vertexCount: number): [number, number, number] => {
  let meanX = 0
  let meanY = 0
  let meanZ = 0

  for (let i = 0; i < vertexCount; i++) {
    meanX += centers[i * 3]
    meanY += centers[i * 3 + 1]
    meanZ += centers[i * 3 + 2]
  }

  return [meanX / vertexCount, meanY / vertexCount, meanZ / vertexCount]
}

const computeFlyDirs = (centers: Float32Array, flyDirs: Float32Array, vertexCount: number): void => {
  const [meanX, meanY, meanZ] = computeMeanCenter(centers, vertexCount)

  for (let i = 0; i < vertexCount; i++) {
    const dx = centers[i * 3] - meanX
    const dy = centers[i * 3 + 1] - meanY
    const dz = centers[i * 3 + 2] - meanZ
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (length > 1e-4) {
      flyDirs[i * 3] = dx / length
      flyDirs[i * 3 + 1] = dy / length
      flyDirs[i * 3 + 2] = dz / length
    } else {
      flyDirs[i * 3] = 0
      flyDirs[i * 3 + 1] = 1
      flyDirs[i * 3 + 2] = 0
    }
  }
}

const setBufferAttributes = (geometry: BufferGeometry, buffers: Buffers): void => {
  geometry.setAttribute('position', new BufferAttribute(buffers.positions, 3))
  geometry.setAttribute('uv', new BufferAttribute(buffers.uvs, 2))
  geometry.setAttribute('color', new BufferAttribute(buffers.colors, 3))
  geometry.setAttribute('aTriCenter', new BufferAttribute(buffers.triCenters, 3))
  geometry.setAttribute('aFlyDir', new BufferAttribute(buffers.flyDirs, 3))
  geometry.setAttribute('aTriSeed', new BufferAttribute(buffers.triSeeds, 1))
  geometry.computeVertexNormals()
}

const materializeTagIndices = (tagLists: Map<string, number[]>): Map<string, Uint32Array> => {
  const out = new Map<string, Uint32Array>()

  for (const [tag, indices] of tagLists) {
    out.set(tag, new Uint32Array(indices))
  }

  return out
}

export const buildGeometry = (triangles: Triangle[]): GeometryBuild => {
  const buckets = bucketByMaterial(triangles)
  const vertexCount = triangles.length * 3
  const buffers = allocateBuffers(vertexCount)
  const geometry = new BufferGeometry()

  const tagLists = packAttributes(buckets, buffers, geometry)

  computeFlyDirs(buffers.triCenters, buffers.flyDirs, vertexCount)
  setBufferAttributes(geometry, buffers)

  return { geometry, taggedIndices: materializeTagIndices(tagLists) }
}
