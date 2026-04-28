import { useFrame } from '@react-three/fiber'
import { Group } from 'three'

import type { TrackSpline } from '../../../constructor/trackSpline'
import type { Ship as ShipType } from './ship'

import Ship from './Ship/Ship'
import ShipCollisions from './ShipCollisions/ShipCollisions'
import { calculatePackBias, tickShip } from './shipUtils'

type ShipsProps = {
  ships: ShipType[]
  splines: TrackSpline[]
  templates: Group[]
}

const Ships = ({ ships, splines, templates }: ShipsProps) => {
  useFrame((_, dt) => {
    for (let i = 0; i < ships.length; i++) {
      const ship = ships[i]
      const group = ship.groupRef.current

      if (!group) {
        continue
      }

      const packBias = ship.isCameraTarget ? calculatePackBias(ship, ships) : 0
      tickShip(ship, splines, packBias, dt)
    }
  })

  return (
    <>
      {ships.map((ship, i) => (
        <Ship key={i} ship={ship} template={templates[i]} />
      ))}
      <ShipCollisions ships={ships} />
    </>
  )
}

export default Ships
