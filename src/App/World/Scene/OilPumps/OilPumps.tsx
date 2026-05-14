import type { Group } from 'three'

import { useFrame } from '@react-three/fiber'

import { audioState } from '../../../../audio'
import { OIL_PUMP_AMBIENT_FREQ_HZ, OIL_PUMP_AMPLITUDE, TWO_PI } from '../../../../constants'

type OilPumpsProps = {
  pumps: Group[]
}

const OilPumps = ({ pumps }: OilPumpsProps) => {
  useFrame((state) => {
    // When a BPM is locked we sync pumps to one nod per bar so they breathe
    // with the music; otherwise we fall back to the original ambient sweep.
    const phase =
      audioState.bpm > 0
        ? audioState.bar * TWO_PI
        : state.clock.elapsedTime * OIL_PUMP_AMBIENT_FREQ_HZ * TWO_PI
    const angle = Math.sin(phase) * OIL_PUMP_AMPLITUDE

    for (const pump of pumps) {
      pump.rotation.x = angle
    }
  })

  return (
    <>
      {pumps.map((pump, index) => (
        <primitive key={index} object={pump} />
      ))}
    </>
  )
}

export default OilPumps
