import type { Mesh } from 'three'

import useWeaponTilesReactivity from '../../../../reactivity/useWeaponTilesReactivity'

type WeaponTilesProps = {
  indices: Uint32Array
  mesh: Mesh
}

const WeaponTiles = ({ indices, mesh }: WeaponTilesProps) => {
  useWeaponTilesReactivity(mesh, indices)

  return null
}

export default WeaponTiles
