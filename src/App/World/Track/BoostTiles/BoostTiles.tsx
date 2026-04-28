import type { Mesh } from 'three'

import type { BoostSection } from '../../../../constructor/track'
import type { TrackSpline } from '../../../../constructor/trackSpline'
import type { Ship } from '../../Ships/ship'

import useBoostTilesReactivity from '../../../../reactivity/useBoostTilesReactivity'

type BoostTilesProps = {
  baseColor: [number, number, number]
  mesh: Mesh
  sections: BoostSection[]
  ships: Ship[]
  splines: TrackSpline[]
}

const BoostTiles = ({ baseColor, mesh, sections, ships, splines }: BoostTilesProps) => {
  useBoostTilesReactivity(mesh, sections, splines, baseColor, ships)

  return null
}

export default BoostTiles
