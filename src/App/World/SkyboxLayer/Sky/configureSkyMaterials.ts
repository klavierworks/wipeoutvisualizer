import { Color, DoubleSide, Group, Mesh, MeshBasicMaterial } from 'three'

import type { SectionInfo } from '../../../../audio/preanalysis/sections'

import { audioState } from '../../../../audio'
import { SKY_FADE_SECONDS } from '../../../../constants'

export const getSkyBaseColor = (material: MeshBasicMaterial): Color | undefined => {
  const stored = material.userData.skyBaseColor

  return stored instanceof Color ? stored : undefined
}

export type SkyRole = 'current' | 'next'

const findCurrentSection = (sections: SectionInfo[], time: number): null | SectionInfo => {
  for (let i = sections.length - 1; i >= 0; i--) {
    if (time >= sections[i].start) {
      return sections[i]
    }
  }

  return null
}

export const computeFade = (offlineSections: null | SectionInfo[]): number => {
  if (!offlineSections || offlineSections.length === 0) {
    return 0
  }

  const section = findCurrentSection(offlineSections, audioState.time)

  if (!section) {
    return 0
  }

  const timeIntoSection = audioState.time - section.start
  const timeToNext = Math.max(0, section.duration - timeIntoSection)

  return Math.max(0, Math.min(1, 1 - timeToNext / SKY_FADE_SECONDS))
}

const configureMaterial = (
  material: MeshBasicMaterial,
  isNext: boolean,
  offlineSections: null | SectionInfo[],
): void => {
  material.side = DoubleSide

  if (!getSkyBaseColor(material)) {
    material.userData.skyBaseColor = material.color.clone()
  }

  if (isNext) {
    material.transparent = true
    material.alphaTest = 0
    material.opacity = computeFade(offlineSections)
    material.depthWrite = false

    return
  }

  material.transparent = false
  material.opacity = 1
}

export const configureSkyMaterials = (
  object: Group,
  role: SkyRole,
  offlineSections: null | SectionInfo[],
): MeshBasicMaterial[] => {
  const isNext = role === 'next'
  const collected: MeshBasicMaterial[] = []

  object.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }

    child.frustumCulled = false
    const list = Array.isArray(child.material) ? child.material : [child.material]

    for (const entry of list) {
      const material = entry as MeshBasicMaterial

      configureMaterial(material, isNext, offlineSections)
      collected.push(material)
    }
  })

  return collected
}
