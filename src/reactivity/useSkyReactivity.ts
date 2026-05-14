import { useFrame } from '@react-three/fiber'
import { MeshBasicMaterial } from 'three'

import type { SectionInfo } from '../audio'

import { computeFade, getSkyBaseColor } from '../App/World/SkyboxLayer/Sky/configureSkyMaterials'
import { audioState } from '../audio'
import { SKY_HUE_CYCLE } from '../constants'

type SkyRole = 'current' | 'next'

const pickHue = (beat: number): readonly [number, number, number] => {
  if (audioState.bpm <= 0) {
    return SKY_HUE_CYCLE[0]
  }

  const index = ((Math.floor(beat) % SKY_HUE_CYCLE.length) + SKY_HUE_CYCLE.length) % SKY_HUE_CYCLE.length

  return SKY_HUE_CYCLE[index]
}

const useSkyReactivity = (
  materials: MeshBasicMaterial[],
  role: SkyRole,
  offlineSections: null | SectionInfo[],
) => {
  useFrame(() => {
    if (materials.length === 0) {
      return
    }

    const hue = pickHue(audioState.beat)
    const fade = role === 'next' ? computeFade(offlineSections) : 1

    for (let i = 0; i < materials.length; i++) {
      const material = materials[i]
      const base = getSkyBaseColor(material)

      if (base) {
        material.color.setRGB(base.r * hue[0], base.g * hue[1], base.b * hue[2])
      }

      if (role === 'next') {
        material.opacity = fade
      }
    }
  })
}

export default useSkyReactivity
