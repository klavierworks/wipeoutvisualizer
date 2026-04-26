import { useEffect, useState } from 'react'
import { Group, MeshBasicMaterial } from 'three'

import type { SectionInfo } from '../../../../audio'

import useSkyReactivity from '../../../../reactivity/useSkyReactivity'
import { configureSkyMaterials, type SkyRole } from './configureSkyMaterials'

type SkyProps = {
  object: Group
  offlineSections: null | SectionInfo[]
  role: SkyRole
}

const Sky = ({ object, offlineSections, role }: SkyProps) => {
  const [materials, setMaterials] = useState<MeshBasicMaterial[]>([])

  useEffect(() => {
    setMaterials(configureSkyMaterials(object, role, offlineSections))
  }, [object, role, offlineSections])

  useSkyReactivity(materials, role, offlineSections)

  return <primitive object={object} />
}

export default Sky
