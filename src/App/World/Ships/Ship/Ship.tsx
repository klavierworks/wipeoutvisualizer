import { Group } from 'three'

import type { Ship as ShipType } from '../ship'

import useWarpTransition from '../useWarpTransition'
import Plume from './Plume/Plume'

type ShipProps = {
  ship: ShipType
  template: Group
}

const Ship = ({ ship, template }: ShipProps) => {
  const clones = useWarpTransition(template)

  return (
    <group ref={ship.groupRef} scale={0.5}>
      <primitive key={clones.current.group.uuid} object={clones.current.group} scale={1} />
      <Plume ship={ship} warpShip={clones.current} />
      {clones.departing && (
        <>
          <primitive key={clones.departing.group.uuid} object={clones.departing.group} scale={3} />
          <Plume ship={ship} warpShip={clones.departing} />
        </>
      )}
    </group>
  )
}

export default Ship
