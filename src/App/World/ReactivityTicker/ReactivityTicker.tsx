import { useFrame } from '@react-three/fiber'

import { sampleBpmSpeedMultiplier } from '../../../reactivity/derive/calculateBpmSpeedMultiplier'
import { sampleSectionEnergy } from '../../../reactivity/derive/calculateSectionEnergy'

const ReactivityTicker = () => {
  useFrame(({ clock }) => {
    const currentTime = clock.getElapsedTime()

    sampleSectionEnergy(currentTime)
    sampleBpmSpeedMultiplier(currentTime)
  })

  return null
}

export default ReactivityTicker
