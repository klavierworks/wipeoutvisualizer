import { createPortal, useFrame } from '@react-three/fiber'
import { ReactNode, useMemo } from 'react'
import { PerspectiveCamera, Scene as ThreeScene } from 'three'

type SkyboxLayerProps = {
  children: ReactNode
}

const SkyboxLayer = ({ children }: SkyboxLayerProps) => {
  const skyScene = useMemo(() => new ThreeScene(), [])
  const skyCamera = useMemo(() => new PerspectiveCamera(50, 1, 0.1, 100_000), [])

  useFrame(({ camera, gl, scene, size }) => {
    skyCamera.quaternion.copy(camera.quaternion)

    if ('fov' in camera) {
      skyCamera.fov = (camera as PerspectiveCamera).fov
    }

    skyCamera.aspect = size.width / size.height
    skyCamera.updateProjectionMatrix()

    gl.autoClear = false
    gl.clear()
    gl.render(skyScene, skyCamera)
    gl.clearDepth()
    gl.render(scene, camera)
  }, 1)

  return <>{createPortal(children, skyScene)}</>
}

export default SkyboxLayer
