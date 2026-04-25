import type { DecodedImage, TrackTextureIndex } from '../reader-bridge'

import { DEFAULT_TRACK_TILE_SIZE, TRACK_TEXTURE_GRID } from './constants'

export const composeTextures = (tiles: DecodedImage[], indices: TrackTextureIndex[]): DecodedImage[] =>
  indices.map((index) => composeOne(tiles, index.near))

const composeOne = (tiles: DecodedImage[], near: number[]): DecodedImage => {
  const tileSize = tiles[near[0]]?.width ?? DEFAULT_TRACK_TILE_SIZE
  const size = tileSize * TRACK_TEXTURE_GRID
  const rgba = new Uint8Array(size * size * 4)

  for (let gridY = 0; gridY < TRACK_TEXTURE_GRID; gridY++) {
    for (let gridX = 0; gridX < TRACK_TEXTURE_GRID; gridX++) {
      const tile = tiles[near[gridY * TRACK_TEXTURE_GRID + gridX]]

      if (!tile) {
        continue
      }

      copyTile(tile, rgba, size, gridX * tileSize, gridY * tileSize)
    }
  }

  return { height: size, rgba, width: size }
}

const copyTile = (
  tile: DecodedImage,
  destination: Uint8Array,
  destinationWidth: number,
  offsetX: number,
  offsetY: number,
) => {
  for (let y = 0; y < tile.height; y++) {
    const sourceRow = y * tile.width * 4
    const destinationRow = ((offsetY + y) * destinationWidth + offsetX) * 4
    destination.set(tile.rgba.subarray(sourceRow, sourceRow + tile.width * 4), destinationRow)
  }
}
