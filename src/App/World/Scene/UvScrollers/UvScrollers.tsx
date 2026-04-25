import { useFrame } from '@react-three/fiber'

import type { UvScroller } from '../../../../constructor/scene'

type UvScrollersProps = {
  scrollers: UvScroller[]
}

const UvScrollers = ({ scrollers }: UvScrollersProps) => {
  useFrame((_, dt) => {
    for (const scroller of scrollers) {
      const [u, v] = scroller.speed

      for (const texture of scroller.textures) {
        texture.offset.x += u * dt
        texture.offset.y += v * dt
      }
    }
  })

  return (
    <>
      {scrollers.map((scroller, index) => (
        <primitive key={index} object={scroller.group} scale={1} />
      ))}
    </>
  )
}

export default UvScrollers
