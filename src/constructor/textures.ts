import { DataTexture, NearestFilter, RGBAFormat, UnsignedByteType } from 'three'

import type { DecodedImage } from '../reader-bridge'

export const createTexture = (image: DecodedImage): DataTexture => {
  const texture = new DataTexture(image.rgba, image.width, image.height, RGBAFormat, UnsignedByteType)
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.flipY = true
  texture.needsUpdate = true

  return texture
}

export const createTextures = (images: DecodedImage[]): DataTexture[] => images.map(createTexture)
