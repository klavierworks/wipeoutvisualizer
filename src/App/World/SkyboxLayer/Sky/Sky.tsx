import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Group, MeshBasicMaterial } from 'three'

import type { SectionInfo } from '../../../../audio/preanalysis/sections'

import { computeFade, configureSkyMaterials, type SkyRole } from './configureSkyMaterials'

type SkyProps = {
  object: Group
  offlineSections: null | SectionInfo[]
  role: SkyRole
}

const Sky = ({ object, offlineSections, role }: SkyProps) => {
  const materialsRef = useRef<MeshBasicMaterial[]>([])

  useEffect(() => {
    materialsRef.current = configureSkyMaterials(object, role, offlineSections)
  }, [object, role, offlineSections])

  useFrame(() => {
    if (role !== 'next') {
      return
    }

    const fade = computeFade(offlineSections)

    for (const material of materialsRef.current) {
      material.opacity = fade
    }
  })

  return <primitive object={object} />
}

export default Sky
