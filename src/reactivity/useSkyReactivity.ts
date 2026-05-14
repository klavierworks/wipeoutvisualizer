import { useFrame } from '@react-three/fiber'
import { MeshBasicMaterial } from 'three'

import type { SectionInfo } from '../audio'

import { computeFade, getSkyBaseColor } from '../App/World/SkyboxLayer/Sky/configureSkyMaterials'
import { audioState } from '../audio'
import { SKY_HUE_CYCLE, SKY_MID_SATURATION_GAIN, SKY_MIN_SATURATION } from '../constants'

type SkyRole = 'current' | 'next'

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

const pickHue = (phase: number): readonly [number, number, number] => {
  if (audioState.bpm <= 0) {
    return SKY_HUE_CYCLE[0]
  }

  const index = ((Math.floor(phase) % SKY_HUE_CYCLE.length) + SKY_HUE_CYCLE.length) % SKY_HUE_CYCLE.length

  return SKY_HUE_CYCLE[index]
}

const computeSaturation = (): number => {
  const lift = clamp01(audioState.mid * SKY_MID_SATURATION_GAIN)

  return SKY_MIN_SATURATION + (1 - SKY_MIN_SATURATION) * lift
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

    const hue = pickHue(audioState.bar)
    const saturation = computeSaturation()
    const fade = role === 'next' ? computeFade(offlineSections) : 1

    for (let i = 0; i < materials.length; i++) {
      const material = materials[i]
      const base = getSkyBaseColor(material)

      if (base) {
        const tintedR = base.r * hue[0]
        const tintedG = base.g * hue[1]
        const tintedB = base.b * hue[2]
        const luma = 0.2126 * tintedR + 0.7152 * tintedG + 0.0722 * tintedB

        material.color.setRGB(
          luma + (tintedR - luma) * saturation,
          luma + (tintedG - luma) * saturation,
          luma + (tintedB - luma) * saturation,
        )
      }

      if (role === 'next') {
        material.opacity = fade
      }
    }
  })
}

export default useSkyReactivity
