import { Box3, Object3D, PerspectiveCamera, Vector3 } from 'three'

const FRAMING_PADDING = 1.4

export const ensureFaviconLink = (): HTMLLinkElement => {
  const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (existing) {
    return existing
  }
  const link = document.createElement('link')
  link.rel = 'icon'
  document.head.appendChild(link)
  return link
}

export const writePixelsFlipped = (
  pixels: Uint8Array,
  imageData: ImageData,
  size: number,
): void => {
  const stride = size * 4
  for (let y = 0; y < size; y++) {
    const sourceOffset = (size - 1 - y) * stride
    imageData.data.set(pixels.subarray(sourceOffset, sourceOffset + stride), y * stride)
  }
}

// Side-on view: camera offset along world +X, looking at the object's centre.
// Distance is sized to fit the larger of the YZ extents into the camera FOV.
export const frameSideOn = (camera: PerspectiveCamera, object: Object3D): void => {
  const box = new Box3().setFromObject(object)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())

  const halfExtent = Math.max(size.y, size.z) / 2
  const distance = (halfExtent / Math.tan((camera.fov * Math.PI) / 360)) * FRAMING_PADDING

  camera.position.set(center.x + distance, center.y, center.z)
  camera.lookAt(center)
}
