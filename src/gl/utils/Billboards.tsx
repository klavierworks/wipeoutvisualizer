import { useFrame } from '@react-three/fiber'

export const Billboards = () => {
  useFrame(({ camera, scene }) => {
    scene.traverse((object) => {
      if (object.userData.isFacingCamera) {
        object.rotation.y = camera.rotation.y
      }
    })
  })
  return null
}
