import { Group } from 'three'

import type { ObjectBundle } from '../reader-bridge'

import { constructObjectBundle } from './object'

export const prepareShips = (bundle: ObjectBundle): Group[] => {
  const container = constructObjectBundle(bundle, { applyPlume: true })
  const ships = [...container.children] as Group[]

  for (const ship of ships) {
    container.remove(ship)
    ship.position.set(0, 0, 0)
    ship.rotation.set(0, 0, 0)
  }

  return ships
}
