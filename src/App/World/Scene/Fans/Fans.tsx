import type { Group } from 'three'

import { useFrame } from '@react-three/fiber'

import { audioState } from '../../../../audio'
import { FAN_BASS_BOOST, FAN_RMS_BOOST, FAN_SPEED_RAD_PER_SEC } from '../../../../constants'

type FansProps = {
  fans: Group[]
}

const Fans = ({ fans }: FansProps) => {
  useFrame((_, dt) => {
    const reactiveMultiplier = 1 + audioState.bass * FAN_BASS_BOOST + audioState.rms * FAN_RMS_BOOST
    const step = dt * FAN_SPEED_RAD_PER_SEC * reactiveMultiplier

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
