import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Color, MeshBasicMaterial } from 'three'

import type { SectionInfo } from '../audio'

import { computeFade } from '../App/World/SkyboxLayer/Sky/configureSkyMaterials'
import { audioState } from '../audio'
import { SKY_TINT_LOUD, SKY_TINT_QUIET } from '../constants'

type SkyRole = 'current' | 'next'

const captureBaseColors = (materials: MeshBasicMaterial[]): Color[] =>
  materials.map((material) => material.color.clone())

const useSkyReactivity = (
  materials: MeshBasicMaterial[],
  role: SkyRole,
  offlineSections: null | SectionInfo[],
) => {
  const baseColorsRef = useRef<Color[]>([])

  useEffect(() => {
    baseColorsRef.current = captureBaseColors(materials)
  }, [materials])

  useFrame(() => {
    if (materials.length === 0) {
      return
    }

    const baseColors = baseColorsRef.current
    const energy = audioState.sectionEnergy
    const tint = SKY_TINT_QUIET + (SKY_TINT_LOUD - SKY_TINT_QUIET) * energy
    const fade = role === 'next' ? computeFade(offlineSections) : 1

    for (let i = 0; i < materials.length; i++) {
      const base = baseColors[i]

      if (base) {
        materials[i].color.copy(base).multiplyScalar(tint)
      }

      if (role === 'next') {
        materials[i].opacity = fade
      }
    }
  })
}

export default useSkyReactivity
