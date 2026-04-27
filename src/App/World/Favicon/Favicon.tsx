import { createPortal, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Group, PerspectiveCamera, Scene as ThreeScene, WebGLRenderTarget } from 'three'

import useWarpTransition from '../Ships/useWarpTransition'
import { ensureFaviconLink, frameSideOn, writePixelsFlipped } from './faviconUtils'

type FaviconProps = {
  fps?: number
  size?: number
  template: Group
}

const _scratchClearColor = new Color()

const Favicon = ({ fps = 15, size = 32, template }: FaviconProps) => {
  const scene = useMemo(() => new ThreeScene(), [])
  const camera = useMemo(() => new PerspectiveCamera(40, 1, 1, 100_000), [])
  const target = useMemo(() => new WebGLRenderTarget(size, size), [size])
  const pixels = useMemo(() => new Uint8Array(size * size * 4), [size])

  const canvas = useMemo(() => {
    const next = document.createElement('canvas')
    next.width = size
    next.height = size
    return next
  }, [size])

  const imageData = useMemo(() => {
    const context = canvas.getContext('2d')
    return context ? context.createImageData(size, size) : null
  }, [canvas, size])

  const linkRef = useRef<HTMLLinkElement | null>(null)
  const lastFrameTimeRef = useRef<number>(-Infinity)

  const clones = useWarpTransition(template)

  useEffect(() => {
    const link = ensureFaviconLink()
    const previousHref = link.href
    const previousType = link.type
    link.type = 'image/png'
    linkRef.current = link

    return () => {
      link.href = previousHref
      link.type = previousType
      linkRef.current = null
      target.dispose()
    }
  }, [target])

  useEffect(() => {
    frameSideOn(camera, clones.current.group)
  }, [camera, clones])

  useFrame(({ clock, gl }) => {
    const interval = 1 / fps
    if (clock.elapsedTime - lastFrameTimeRef.current < interval) {
      return
    }
    lastFrameTimeRef.current = clock.elapsedTime

    const previousTarget = gl.getRenderTarget()
    const previousAlpha = gl.getClearAlpha()
    gl.getClearColor(_scratchClearColor)

    gl.setClearColor(0x000000, 0)
    gl.setRenderTarget(target)
    gl.clear(true, true, true)
    gl.render(scene, camera)
    gl.readRenderTargetPixels(target, 0, 0, size, size, pixels)
    gl.setRenderTarget(previousTarget)
    gl.setClearColor(_scratchClearColor, previousAlpha)

    const context = canvas.getContext('2d')
    const link = linkRef.current
    if (!context || !imageData || !link) {
      return
    }
    writePixelsFlipped(pixels, imageData, size)
    context.putImageData(imageData, 0, 0)
    link.href = canvas.toDataURL('image/png')
  })

  return (
    <>
      {createPortal(
        <>
          <primitive key={clones.current.group.uuid} object={clones.current.group} />
          {clones.departing && (
            <primitive key={clones.departing.group.uuid} object={clones.departing.group} />
          )}
        </>,
        scene,
      )}
    </>
  )
}

export default Favicon
