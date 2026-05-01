import { useFrame } from '@react-three/fiber'
import { MeshBasicMaterial } from 'three'

import type { SectionInfo } from '../audio'

import { computeFade, getSkyBaseColor } from '../App/World/SkyboxLayer/Sky/configureSkyMaterials'
import { audioState } from '../audio'
import { SKY_TINT_LOUD, SKY_TINT_QUIET } from '../constants'

type SkyRole = 'current' | 'next'

const useSkyReactivity = (
  materials: MeshBasicMaterial[],
  role: SkyRole,
  offlineSections: null | SectionInfo[],
) => {
  useFrame(() => {
    if (materials.length === 0) {
      return
    }

    const pulse = audioState.bpm > 0 ? 1 - audioState.beatPhase : 0
    const tint = SKY_TINT_QUIET + (SKY_TINT_LOUD - SKY_TINT_QUIET) * pulse
    const fade = role === 'next' ? computeFade(offlineSections) : 1

    for (let i = 0; i < materials.length; i++) {
      const material = materials[i]
      const base = getSkyBaseColor(material)

      if (base) {
        material.color.copy(base).multiplyScalar(tint)
      }

      if (role === 'next') {
        material.opacity = fade
      }
    }
  })
}

export default useSkyReactivity
