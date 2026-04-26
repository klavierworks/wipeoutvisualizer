import { MutableRefObject } from 'react'

import type { WarpShip } from '../../../warpShip'

import usePlumeReactivity from '../../../../../../reactivity/usePlumeReactivity'

type PlumeProps = {
  isBoostingRef: MutableRefObject<boolean>
  warpShip: WarpShip
}

const Plume = ({ isBoostingRef, warpShip }: PlumeProps) => {
  usePlumeReactivity(warpShip, isBoostingRef)

  return null
}

export default Plume
