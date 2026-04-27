import type { DataTexture } from 'three'

import { Group, Mesh, MeshBasicMaterial, RepeatWrapping } from 'three'

import type { ObjectBundle, WipeoutObject } from '../reader-bridge'

import {
  SCENE_NAME_FAN_PREFIXES,
  SCENE_NAME_OIL_PUMP_PREFIXES,
  SCENE_NAME_OPACITY_PULSE_PREFIXES,
  SCENE_NAME_RED_LIGHT_PREFIXES,
  SCENE_NAME_STAND_PREFIXES,
  SCENE_NAME_UV_SCROLL_PREFIXES,
  SCENE_NAME_WHITE_LIGHT_PREFIXES,
} from './constants'
import { buildObject } from './object'
import { createTextures } from './textures'

export type BeatLight =
  | { group: Group; kind: 'opacity'; materials: MeshBasicMaterial[] }
  | { group: Group; kind: 'red' }
  | { group: Group; kind: 'white' }

export type SceneBundle = {
  base: Group
  beatLights: BeatLight[]
  crowdStands: Group[]
  fans: Group[]
  oilPumps: Group[]
  uvScrollers: UvScroller[]
}

export type UvScroller = {
  group: Group
  speed: [number, number]
  textures: DataTexture[]
}

const matchesAnyPrefix = (name: string, prefixes: readonly string[]): boolean =>
  prefixes.some((prefix) => name.startsWith(prefix))

const findUvScrollPrefix = (name: string): string | undefined =>
  Object.keys(SCENE_NAME_UV_SCROLL_PREFIXES).find((prefix) => name.startsWith(prefix))

const traverseMaterials = (group: Group): MeshBasicMaterial[] => {
  const collected: MeshBasicMaterial[] = []

  group.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material]

    for (const material of materials) {
      if (material instanceof MeshBasicMaterial) {
        collected.push(material)
      }
    }
  })

  return collected
}

const cloneScrollableTextures = (group: Group): DataTexture[] => {
  const cloned: DataTexture[] = []

  for (const material of traverseMaterials(group)) {
    if (!material.map) {
      continue
    }

    const next = material.map.clone() as DataTexture
    next.needsUpdate = true
    next.wrapS = RepeatWrapping
    next.wrapT = RepeatWrapping
    material.map = next
    cloned.push(next)
  }

  return cloned
}

const prepareOpacityMaterials = (group: Group): MeshBasicMaterial[] => {
  const materials = traverseMaterials(group)

  for (const material of materials) {
    material.transparent = true
  }

  return materials
}

const buildBeatLight = (
  object: WipeoutObject,
  textures: DataTexture[],
  kind: 'red' | 'white',
): BeatLight => ({ group: buildObject(object, textures, {}).group, kind })

const buildOpacityLight = (object: WipeoutObject, textures: DataTexture[]): BeatLight => {
  const group = buildObject(object, textures, {}).group
  const materials = prepareOpacityMaterials(group)

  return { group, kind: 'opacity', materials }
}

export const constructScene = (bundle: ObjectBundle): SceneBundle => {
  const textures = createTextures(bundle.images)
  const base = new Group()
  const beatLights: BeatLight[] = []
  const crowdStands: Group[] = []
  const fans: Group[] = []
  const oilPumps: Group[] = []
  const uvScrollers: UvScroller[] = []

  for (const object of bundle.objects) {
    const name = object.header.name

    if (matchesAnyPrefix(name, SCENE_NAME_RED_LIGHT_PREFIXES)) {
      beatLights.push(buildBeatLight(object, textures, 'red'))

      continue
    }

    if (matchesAnyPrefix(name, SCENE_NAME_WHITE_LIGHT_PREFIXES)) {
      beatLights.push(buildBeatLight(object, textures, 'white'))

      continue
    }

    if (matchesAnyPrefix(name, SCENE_NAME_OPACITY_PULSE_PREFIXES)) {
      beatLights.push(buildOpacityLight(object, textures))

      continue
    }

    if (matchesAnyPrefix(name, SCENE_NAME_OIL_PUMP_PREFIXES)) {
      oilPumps.push(buildObject(object, textures, {}).group)

      continue
    }

    if (matchesAnyPrefix(name, SCENE_NAME_FAN_PREFIXES)) {
      fans.push(buildObject(object, textures, {}).group)

      continue
    }

    if (matchesAnyPrefix(name, SCENE_NAME_STAND_PREFIXES)) {
      crowdStands.push(buildObject(object, textures, {}).group)

      continue
    }

    const scrollPrefix = findUvScrollPrefix(name)

    if (scrollPrefix) {
      const group = buildObject(object, textures, {}).group
      const cloned = cloneScrollableTextures(group)
      uvScrollers.push({ group, speed: SCENE_NAME_UV_SCROLL_PREFIXES[scrollPrefix], textures: cloned })

      continue
    }

    base.add(buildObject(object, textures, {}).group)
  }

  return { base, beatLights, crowdStands, fans, oilPumps, uvScrollers }
}
