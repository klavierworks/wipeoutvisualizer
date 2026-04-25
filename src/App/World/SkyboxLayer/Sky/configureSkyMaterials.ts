import { DoubleSide, Group, Mesh, MeshBasicMaterial } from 'three'

import { audioState } from '../../../../audio'
import { SKY_FADE_SECONDS } from '../../../../constants'

export type SkyRole = 'current' | 'next'

export const computeFade = (): number => {
  const section = audioState.sections[audioState.sectionIndex]
  const timeToNext = section ? Math.max(0, section.duration - audioState.sectionTime) : Infinity

  return Math.max(0, Math.min(1, 1 - timeToNext / SKY_FADE_SECONDS))
}

const configureMaterial = (material: MeshBasicMaterial, isNext: boolean): void => {
  material.side = DoubleSide

  if (isNext) {
    material.transparent = true
    material.alphaTest = 0
    material.opacity = computeFade()
    material.depthWrite = false

    return
  }

  material.transparent = false
  material.opacity = 1
}

export const configureSkyMaterials = (object: Group, role: SkyRole): MeshBasicMaterial[] => {
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

      configureMaterial(material, isNext)
      collected.push(material)
    }
  })

  return collected
}
