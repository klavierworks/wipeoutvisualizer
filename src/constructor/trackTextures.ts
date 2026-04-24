import type { DecodedImage, TrackTextureIndex } from '../reader-bridge'

const GRID = 4

export const composeTextures = (
  tiles: DecodedImage[],
  indices: TrackTextureIndex[]
): DecodedImage[] => indices.map((idx) => composeOne(tiles, idx.near))

const composeOne = (tiles: DecodedImage[], near: number[]): DecodedImage => {
  const tileSize = tiles[near[0]]?.width ?? 32
  const size = tileSize * GRID
  const rgba = new Uint8Array(size * size * 4)

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const tile = tiles[near[gy * GRID + gx]]
      if (!tile) continue
      copyTile(tile, rgba, size, gx * tileSize, gy * tileSize)
    }
  }
  return { width: size, height: size, rgba }
}

const copyTile = (tile: DecodedImage, dst: Uint8Array, dstWidth: number, ox: number, oy: number) => {
  for (let y = 0; y < tile.height; y++) {
    const srcRow = y * tile.width * 4
    const dstRow = ((oy + y) * dstWidth + ox) * 4
    dst.set(tile.rgba.subarray(srcRow, srcRow + tile.width * 4), dstRow)
  }
}
