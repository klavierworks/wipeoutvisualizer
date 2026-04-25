import { Group } from 'three'

import type { DecodedImage, ExtrasData, ReaderResult } from '../reader-bridge'

import { constructObjectBundle } from './object'
import { constructScene, type SceneBundle } from './scene'
import { prepareShips } from './ships'
import { type BuiltTrack, constructTrack } from './track'
import { buildTrackSplines, type TrackSpline } from './trackSpline'

export type Built = {
  scene: SceneBundle
  ships: {
    meshes: Group[]
    splines: TrackSpline[]
  }
  sky: Group
  track: BuiltTrack
}

export type BuiltExtras = {
  atlases: Record<string, DecodedImage[]>
  meshes: Record<string, Group>
}

export const construct = (data: ReaderResult): Built => ({
  scene: constructScene(data.scene),
  ships: {
    meshes: prepareShips(data.ships),
    splines: buildTrackSplines(data.track),
  },
  sky: constructObjectBundle(data.sky),
  track: constructTrack(data.track),
})

export const constructExtras = (data: ExtrasData): BuiltExtras => ({
  atlases: data.textures,
  meshes: Object.fromEntries(
    Object.entries(data.geometry).map(([name, bundle]) => [name, constructObjectBundle(bundle)]),
  ),
})
