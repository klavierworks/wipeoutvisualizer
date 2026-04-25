import type { DecodedImage, ExtrasData, ObjectBundle, ReaderResult, TrackData, WipeoutObject } from './types'

import { COMMON_DIR, EXTRA_GEOMETRY, EXTRA_TEXTURES } from './constants'
import { fetchAll, fetchBytes } from './fetch'
import { getReader } from './wasm'

export type { DecodedImage, ExtrasData, ObjectBundle, ReaderResult, TrackData } from './types'
export type {
  ObjectHeader,
  Polygon,
  TrackFace,
  TrackSection,
  TrackTexture,
  TrackTextureIndex,
  TrackVertex,
  Uv,
  Vec3,
  Vertex,
  WipeoutObject,
} from './types'

const decodeImages = async (cmp: Uint8Array): Promise<DecodedImage[]> => {
  const reader = await getReader()
  const files = reader.unpack_images(cmp) as Uint8Array[]

  return files.map((file) => reader.decode_image(file) as DecodedImage)
}

const loadObjectBundle = async (cmpPath: string, prmPath: string): Promise<ObjectBundle> => {
  const reader = await getReader()
  const [cmp, prm] = await Promise.all([fetchBytes(cmpPath), fetchBytes(prmPath)])

  return { images: await decodeImages(cmp), objects: reader.read_objects(prm) }
}

const fetchOptional = async (path: string): Promise<null | Uint8Array> => {
  try {
    return await fetchBytes(path)
  } catch {
    return null
  }
}

const loadTrackData = async (trackDir: string): Promise<TrackData> => {
  const reader = await getReader()

  const [files, textureBytes] = await Promise.all([
    fetchAll({
      cmp: `${trackDir}/LIBRARY.CMP`,
      trf: `${trackDir}/TRACK.TRF`,
      trs: `${trackDir}/TRACK.TRS`,
      trv: `${trackDir}/TRACK.TRV`,
      ttf: `${trackDir}/LIBRARY.TTF`,
    }),
    fetchOptional(`${trackDir}/TRACK.TEX`),
  ])

  return {
    faces: reader.read_track_faces(files.trf),
    images: await decodeImages(files.cmp),
    sections: reader.read_track_sections(files.trs),
    textureIndex: reader.read_track_texture_index(files.ttf),
    textures: textureBytes ? reader.read_track_textures(textureBytes) : [],
    vertices: reader.read_track_vertices(files.trv),
  }
}

export const loadTrack = async (trackDir: string): Promise<ReaderResult> => {
  const [scene, sky, ships, track] = await Promise.all([
    loadObjectBundle(`${trackDir}/SCENE.CMP`, `${trackDir}/SCENE.PRM`),
    loadObjectBundle(`${trackDir}/SKY.CMP`, `${trackDir}/SKY.PRM`),
    loadObjectBundle('WIPEOUT2/COMMON/TERRY.CMP', 'WIPEOUT2/COMMON/TERRY.PRM'),
    loadTrackData(trackDir),
  ])

  return { scene, ships, sky, track }
}

const collectExtraPaths = (): { cmpPaths: string[]; prmPaths: string[] } => {
  const cmpPaths = new Set<string>()
  const prmPaths = new Set<string>()

  for (const { cmp, prm } of Object.values(EXTRA_GEOMETRY)) {
    cmpPaths.add(`${COMMON_DIR}/${cmp}`)
    prmPaths.add(`${COMMON_DIR}/${prm}`)
  }

  for (const cmp of Object.values(EXTRA_TEXTURES)) {
    cmpPaths.add(`${COMMON_DIR}/${cmp}`)
  }

  return { cmpPaths: [...cmpPaths], prmPaths: [...prmPaths] }
}

const loadCmp = async (path: string): Promise<readonly [string, DecodedImage[] | null]> => {
  try {
    return [path, await decodeImages(await fetchBytes(path))]
  } catch (error) {
    console.warn(`[extras] ${path} failed:`, error)

    return [path, null]
  }
}

const loadPrm = async (path: string): Promise<readonly [string, null | WipeoutObject[]]> => {
  try {
    const reader = await getReader()

    return [path, reader.read_objects(await fetchBytes(path)) as WipeoutObject[]]
  } catch (error) {
    console.warn(`[extras] ${path} failed:`, error)

    return [path, null]
  }
}

type CmpCache = Record<string, DecodedImage[] | null>
type PrmCache = Record<string, null | WipeoutObject[]>

const assembleGeometry = (cmpCache: CmpCache, prmCache: PrmCache): Record<string, ObjectBundle> => {
  const geometry: Record<string, ObjectBundle> = {}

  for (const [name, { cmp, prm }] of Object.entries(EXTRA_GEOMETRY)) {
    const objects = prmCache[`${COMMON_DIR}/${prm}`]
    const images = cmpCache[`${COMMON_DIR}/${cmp}`]

    if (objects && images) {
      geometry[name] = { images, objects }
    }
  }

  return geometry
}

const assembleTextures = (cmpCache: CmpCache): Record<string, DecodedImage[]> => {
  const textures: Record<string, DecodedImage[]> = {}

  for (const [name, cmp] of Object.entries(EXTRA_TEXTURES)) {
    const images = cmpCache[`${COMMON_DIR}/${cmp}`]

    if (images) {
      textures[name] = images
    }
  }

  return textures
}

export const loadExtras = async (): Promise<ExtrasData> => {
  const { cmpPaths, prmPaths } = collectExtraPaths()

  const [cmpEntries, prmEntries] = await Promise.all([
    Promise.all(cmpPaths.map(loadCmp)),
    Promise.all(prmPaths.map(loadPrm)),
  ])

  const cmpCache: CmpCache = Object.fromEntries(cmpEntries)
  const prmCache: PrmCache = Object.fromEntries(prmEntries)

  return { geometry: assembleGeometry(cmpCache, prmCache), textures: assembleTextures(cmpCache) }
}
