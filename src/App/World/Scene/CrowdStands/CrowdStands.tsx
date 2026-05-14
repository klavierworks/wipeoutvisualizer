import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Group } from 'three'

import { audioState } from '../../../../audio'
import { CROWD_BASS_LIFT, CROWD_LIFT_LERP } from '../../../../constants'

type CrowdStandsProps = {
  stands: Group[]
}

const CrowdStands = ({ stands }: CrowdStandsProps) => {
  const liftRef = useRef(0)

  useFrame((_, dt) => {
    const alpha = 1 - Math.exp(-dt * CROWD_LIFT_LERP)
    liftRef.current += (audioState.bass - liftRef.current) * alpha

    const scaleY = 1 + liftRef.current * CROWD_BASS_LIFT

    for (const stand of stands) {
      stand.scale.y = scaleY
    }
  })

  return (
    <>
      {stands.map((stand, index) => (
        <primitive key={index} object={stand} />
      ))}
    </>
  )
}

export default CrowdStands
