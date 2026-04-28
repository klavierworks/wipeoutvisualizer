import type { Ship } from '../../ship'
import type { WarpShip } from '../../warpShip'

import usePlumeReactivity from '../../../../../reactivity/usePlumeReactivity'

type PlumeProps = {
  ship: Ship
  warpShip: WarpShip
}

const Plume = ({ ship, warpShip }: PlumeProps) => {
  usePlumeReactivity(warpShip, ship)

  return null
}

export default Plume
