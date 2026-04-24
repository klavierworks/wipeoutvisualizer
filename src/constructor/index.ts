import { Group } from 'three'
import type { DecodedImage, ExtrasData, ReaderResult } from '../reader-bridge'
import { constructObjectBundle } from './object'
import { prepareShips } from './ships'
import { constructTrack, type BuiltTrack } from './track'
import { buildTrackSpline, type TrackSpline } from './trackSpline'

export type Built = {
  scene: Group
  sky: Group
  track: BuiltTrack
  ships: {
    meshes: Group[]
    spline: TrackSpline
  }
}

export type BuiltExtras = {
  meshes: Record<string, Group>
  atlases: Record<string, DecodedImage[]>
}

export const construct = (data: ReaderResult): Built => ({
  scene: constructObjectBundle(data.scene),
  sky: constructObjectBundle(data.sky),
  track: constructTrack(data.track),
  ships: {
    meshes: prepareShips(data.ships),
    spline: buildTrackSpline(data.track),
  },
})

export const constructExtras = (data: ExtrasData): BuiltExtras => ({
  meshes: Object.fromEntries(
    Object.entries(data.geometry).map(([name, bundle]) => [name, constructObjectBundle(bundle)]),
  ),
  atlases: data.textures,
})
