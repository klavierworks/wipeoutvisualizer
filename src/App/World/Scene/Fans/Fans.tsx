import type { Group } from 'three'

import { useFrame } from '@react-three/fiber'

import { FAN_SPEED_RAD_PER_SEC } from '../../../../constants'

type FansProps = {
  fans: Group[]
}

const Fans = ({ fans }: FansProps) => {
  useFrame((_, dt) => {
    const step = dt * FAN_SPEED_RAD_PER_SEC

    for (const fan of fans) {
      fan.rotation.z += step
    }
  })

  return (
    <>
      {fans.map((fan, index) => (
        <primitive key={index} object={fan} />
      ))}
    </>
  )
}

export default Fans
