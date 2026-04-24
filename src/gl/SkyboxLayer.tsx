import { createPortal, useFrame } from '@react-three/fiber'
import { ReactNode, useMemo } from 'react'
import { PerspectiveCamera, Scene as ThreeScene } from 'three'

type Props = {
  children: ReactNode
}

// Renders its children as a fixed backdrop. Children portal into a separate
// THREE.Scene with its own PerspectiveCamera that is permanently positioned
// at the origin and only inherits the main camera's *orientation* — no
// translation. So the sky always wraps the viewer regardless of where the
// main camera moves through the world. Matches the classic two-pass skybox
// trick used by most engines.
//
// Render flow each frame, taken over from R3F's auto-render via priority 1:
//   1. clear color + depth
//   2. render skyScene with skyCamera (fills entire viewport)
//   3. clearDepth, so main scene wins everywhere it draws
//   4. render main scene + camera as normal
export const SkyboxLayer = ({ children }: Props) => {
  const skyScene = useMemo(() => new ThreeScene(), [])
  const skyCamera = useMemo(() => new PerspectiveCamera(50, 1, 0.1, 100_000), [])

  useFrame(({ gl, scene, camera, size }) => {
    skyCamera.quaternion.copy(camera.quaternion)
    if ('fov' in camera) skyCamera.fov = (camera as PerspectiveCamera).fov
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
