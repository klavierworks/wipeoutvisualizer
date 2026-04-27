import { MutableRefObject } from 'react'
import { Group } from 'three'

import useWarpTransition from '../../useWarpTransition'
import Plume from './Plume/Plume'

type ShipProps = {
  isBoostingRef: MutableRefObject<boolean>
  template: Group
}

const Ship = ({ isBoostingRef, template }: ShipProps) => {
  const clones = useWarpTransition(template)

  return (
    <>
      <primitive key={clones.current.group.uuid} object={clones.current.group} scale={1} />
      <Plume isBoostingRef={isBoostingRef} warpShip={clones.current} />
      {clones.departing && (
        <>
          <primitive key={clones.departing.group.uuid} object={clones.departing.group} scale={3} />
          <Plume isBoostingRef={isBoostingRef} warpShip={clones.departing} />
        </>
      )}
    </>
  )
}

export default Ship
