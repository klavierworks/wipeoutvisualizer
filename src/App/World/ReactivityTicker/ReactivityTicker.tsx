import { useFrame } from '@react-three/fiber'

import { sampleSectionEnergy } from '../../../reactivity/derive/calculateSectionEnergy'

const ReactivityTicker = () => {
  useFrame(({ clock }) => {
    sampleSectionEnergy(clock.getElapsedTime())
  })

  return null
}

export default ReactivityTicker
