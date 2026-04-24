import { fetchAll, fetchBytes } from './fetch'
import { getReader } from './wasm'
import type {
  DecodedImage,
  ExtrasData,
  ObjectBundle,
  ReaderResult,
  TrackData,
  WipeoutObject,
} from './types'

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
  return files.map((f) => reader.decode_image(f) as DecodedImage)
}

const loadObjectBundle = async (cmpPath: string, prmPath: string): Promise<ObjectBundle> => {
  const reader = await getReader()
  const [cmp, prm] = await Promise.all([fetchBytes(cmpPath), fetchBytes(prmPath)])
  return { objects: reader.read_objects(prm), images: await decodeImages(cmp) }
}

const loadTrackData = async (trackDir: string): Promise<TrackData> => {
  const reader = await getReader()
  const files = await fetchAll({
    cmp: `${trackDir}/LIBRARY.CMP`,
    trv: `${trackDir}/TRACK.TRV`,
    trf: `${trackDir}/TRACK.TRF`,
    trs: `${trackDir}/TRACK.TRS`,
    ttf: `${trackDir}/LIBRARY.TTF`,
    tex: `${trackDir}/TRACK.TEX`,
  })
  return {
    vertices: reader.read_track_vertices(files.trv),
    faces: reader.read_track_faces(files.trf),
    sections: reader.read_track_sections(files.trs),
    textureIndex: reader.read_track_texture_index(files.ttf),
    textures: reader.read_track_textures(files.tex),
    images: await decodeImages(files.cmp),
  }
}

export const loadTrack = async (trackDir: string): Promise<ReaderResult> => {
  const [scene, sky, ships, track] = await Promise.all([
    loadObjectBundle(`${trackDir}/SCENE.CMP`, `${trackDir}/SCENE.PRM`),
    loadObjectBundle(`${trackDir}/SKY.CMP`, `${trackDir}/SKY.PRM`),
    loadObjectBundle('WIPEOUT2/COMMON/TERRY.CMP', 'WIPEOUT2/COMMON/TERRY.PRM'),
    loadTrackData(trackDir),
  ])
  return { scene, sky, ships, track }
}

const COMMON_DIR = 'WIPEOUT2/COMMON'
// Per phoboslab's weapon.c, all weapon PRMs share MINE.CMP as their texture atlas.
// Orphan PRMs without a paired CMP are mapped here too; unmatched texture indices
// fall through to the flat-colour fallback material in createMaterials().
const WEAPON_ATLAS = 'MINE.CMP'

const EXTRA_GEOMETRY: Record<string, { prm: string; cmp: string }> = {
  rocket: { prm: 'ROCK.PRM', cmp: WEAPON_ATLAS },
  mine: { prm: 'MINE.PRM', cmp: WEAPON_ATLAS },
  missile: { prm: 'MISS.PRM', cmp: WEAPON_ATLAS },
  electroBolt: { prm: 'EBOLT.PRM', cmp: WEAPON_ATLAS },
  shield: { prm: 'SHLD.PRM', cmp: WEAPON_ATLAS },
  quakeWall: { prm: 'WALL.PRM', cmp: WEAPON_ATLAS },
  collisionHulls: { prm: 'ALCOL.PRM', cmp: 'ALCOL.CMP' },
  rescuer: { prm: 'RESCU.PRM', cmp: 'RESCU.CMP' },
  ring: { prm: 'RINGT.PRM', cmp: 'RINGT.CMP' },
  wreckage: { prm: 'WRECK.PRM', cmp: 'WRECK.CMP' },
  lights: { prm: 'LIGHT.PRM', cmp: 'LIGHT.CMP' },
  spaceroid: { prm: 'SROID.PRM', cmp: 'SROID.CMP' },
  powerBar: { prm: 'PBAR.PRM', cmp: 'PBAR.CMP' },
  train: { prm: 'TRAIN.PRM', cmp: 'TRAIN.CMP' },
  wierd: { prm: 'WIERD.PRM', cmp: 'WIERD.CMP' },
  vectorLogo: { prm: 'VECTO.PRM', cmp: WEAPON_ATLAS },
  venomLogo: { prm: 'VENOM.PRM', cmp: WEAPON_ATLAS },
  rapierLogo: { prm: 'RAPIE.PRM', cmp: WEAPON_ATLAS },
  phantomLogo: { prm: 'PHANT.PRM', cmp: WEAPON_ATLAS },
  asteroid: { prm: 'ASTER.PRM', cmp: WEAPON_ATLAS },
  vrall: { prm: 'VRALL.PRM', cmp: WEAPON_ATLAS },
}

const EXTRA_TEXTURES: Record<string, string> = {
  effects: 'EFFECTS.CMP',
  fonts: 'DRFONTS.CMP',
  hudIcons: 'WICONS.CMP',
  pickupIcons: 'WEPICON.CMP',
}

export const loadExtras = async (): Promise<ExtrasData> => {
  const reader = await getReader()

  const cmpPaths = new Set<string>()
  const prmPaths = new Set<string>()
  for (const { prm, cmp } of Object.values(EXTRA_GEOMETRY)) {
    cmpPaths.add(`${COMMON_DIR}/${cmp}`)
    prmPaths.add(`${COMMON_DIR}/${prm}`)
  }
  for (const cmp of Object.values(EXTRA_TEXTURES)) {
    cmpPaths.add(`${COMMON_DIR}/${cmp}`)
  }

  const loadCmp = async (path: string): Promise<readonly [string, DecodedImage[] | null]> => {
    try {
      return [path, await decodeImages(await fetchBytes(path))]
    } catch (e) {
      console.warn(`[extras] ${path} failed:`, e)
      return [path, null]
    }
  }
  const loadPrm = async (path: string): Promise<readonly [string, WipeoutObject[] | null]> => {
    try {
      return [path, reader.read_objects(await fetchBytes(path)) as WipeoutObject[]]
    } catch (e) {
      console.warn(`[extras] ${path} failed:`, e)
      return [path, null]
    }
  }

  const [cmpEntries, prmEntries] = await Promise.all([
    Promise.all([...cmpPaths].map(loadCmp)),
    Promise.all([...prmPaths].map(loadPrm)),
  ])
  const cmpCache: Record<string, DecodedImage[] | null> = Object.fromEntries(cmpEntries)
  const prmCache: Record<string, WipeoutObject[] | null> = Object.fromEntries(prmEntries)

  const geometry: Record<string, ObjectBundle> = {}
  for (const [name, { prm, cmp }] of Object.entries(EXTRA_GEOMETRY)) {
    const objects = prmCache[`${COMMON_DIR}/${prm}`]
    const images = cmpCache[`${COMMON_DIR}/${cmp}`]
    if (objects && images) geometry[name] = { objects, images }
  }

  const textures: Record<string, DecodedImage[]> = {}
  for (const [name, cmp] of Object.entries(EXTRA_TEXTURES)) {
    const images = cmpCache[`${COMMON_DIR}/${cmp}`]
    if (images) textures[name] = images
  }

  return { geometry, textures }
}

