import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Group, MeshBasicMaterial } from 'three'

import { computeFade, configureSkyMaterials, type SkyRole } from './configureSkyMaterials'

type SkyProps = {
  object: Group
  role: SkyRole
}

const Sky = ({ object, role }: SkyProps) => {
  const materialsRef = useRef<MeshBasicMaterial[]>([])

  useEffect(() => {
    materialsRef.current = configureSkyMaterials(object, role)
  }, [object, role])

  useFrame(() => {
    if (role !== 'next') {
      return
    }

    const fade = computeFade()

    for (const material of materialsRef.current) {
      material.opacity = fade
    }
  })

  return <primitive object={object} />
}

export default Sky
