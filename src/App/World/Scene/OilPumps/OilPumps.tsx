import type { Group } from 'three'

import { useFrame } from '@react-three/fiber'

import { OIL_PUMP_AMPLITUDE, OIL_PUMP_FREQ_HZ, TWO_PI } from '../../../../constants'

type OilPumpsProps = {
  pumps: Group[]
}

const OilPumps = ({ pumps }: OilPumpsProps) => {
  useFrame((state) => {
    const angle = Math.sin(state.clock.elapsedTime * OIL_PUMP_FREQ_HZ * TWO_PI) * OIL_PUMP_AMPLITUDE

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
