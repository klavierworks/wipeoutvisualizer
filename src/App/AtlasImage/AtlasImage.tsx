import { useEffect, useRef } from 'react'

import type { DecodedImage } from '../../reader-bridge'

import styles from './AtlasImage.module.css'

type AtlasImageProps = {
  className?: string
  image: DecodedImage
}

const AtlasImage = ({ className, image }: AtlasImageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    const imageData = context.createImageData(image.width, image.height)
    imageData.data.set(image.rgba)
    context.putImageData(imageData, 0, 0)
  }, [image])

  return (
    <canvas
      className={className ?? styles.canvas}
      height={image.height}
      ref={canvasRef}
      width={image.width}
    />
  )
}

export default AtlasImage
