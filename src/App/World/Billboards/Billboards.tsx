import { useFrame } from '@react-three/fiber'

const Billboards = () => {
  useFrame(({ camera, scene }) => {
    scene.traverse((object) => {
      if (object.userData.isFacingCamera) {
        object.rotation.y = camera.rotation.y
      }
    })
  })

  return null
}

export default Billboards
