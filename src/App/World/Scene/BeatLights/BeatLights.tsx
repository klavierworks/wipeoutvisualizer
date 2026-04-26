import type { BeatLight } from '../../../../constructor/scene'

import useBeatLightsReactivity from '../../../../reactivity/useBeatLightsReactivity'

type BeatLightsProps = {
  lights: BeatLight[]
}

const BeatLights = ({ lights }: BeatLightsProps) => {
  useBeatLightsReactivity(lights)

  return (
    <>
      {lights.map((light, index) => (
        <primitive key={index} object={light.group} scale={1} />
      ))}
    </>
  )
}

export default BeatLights
