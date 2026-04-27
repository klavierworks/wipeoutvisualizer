import type {
  DecodedImage,
  ExtrasData,
  ObjectBundle,
  ReaderResult,
  StartwadAssets,
  TrackData,
  UiAssets,
  WipeoutObject,
} from './types'

import { COMMON_DIR, EXTRA_GEOMETRY, EXTRA_TEXTURES } from './constants'
import { fetchAll, fetchBytes } from './fetch'
import { unpackStartwad } from './startwad'
import { getReader } from './wasm'

export type {
  DecodedImage,
  ExtrasData,
  ObjectBundle,
  ReaderResult,
  StartwadAssets,
  TrackData,
  UiAssets,
} from './types'
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

// Path-suffix sentinels for 2097 track variants:
//
//   "WIPEOUT2/TRACK04/BONUS2"  → reuse parent SCENE/SKY/LIBRARY but use
//                                BONUS2.TRV/.TRF/.TRS for track geometry.
//   "WIPEOUT2/TRACK02/LIBBAK"  → reuse parent's track geometry and SCENE/SKY
//                                but swap LIBRARY.CMP/.TTF for LIBBAK.CMP/.TTF
//                                (alt-themed textures).
//
// Only TRACK04 ships a BONUS2 set and only TRACK02 ships a LIBBAK set in our
// gamefiles.
type TrackVariant = {
  dir: string
  libraryPrefix: 'LIBBAK' | 'LIBRARY'
  trackPrefix: 'BONUS2' | 'TRACK'
}

const BONUS2_SUFFIX = '/BONUS2'
const LIBBAK_SUFFIX = '/LIBBAK'

const splitVariantPath = (trackDir: string): TrackVariant => {
  if (trackDir.endsWith(BONUS2_SUFFIX)) {
    return {
      dir: trackDir.slice(0, -BONUS2_SUFFIX.length),
      libraryPrefix: 'LIBRARY',
      trackPrefix: 'BONUS2',
    }
  }
  if (trackDir.endsWith(LIBBAK_SUFFIX)) {
    return {
      dir: trackDir.slice(0, -LIBBAK_SUFFIX.length),
      libraryPrefix: 'LIBBAK',
      trackPrefix: 'TRACK',
    }
  }
  return { dir: trackDir, libraryPrefix: 'LIBRARY', trackPrefix: 'TRACK' }
}

const loadTrackData = async (trackDir: string): Promise<TrackData> => {
  const reader = await getReader()
  const { dir, libraryPrefix, trackPrefix } = splitVariantPath(trackDir)

  const [files, textureBytes] = await Promise.all([
    fetchAll({
      cmp: `${dir}/${libraryPrefix}.CMP`,
      trf: `${dir}/${trackPrefix}.TRF`,
      trs: `${dir}/${trackPrefix}.TRS`,
      trv: `${dir}/${trackPrefix}.TRV`,
      ttf: `${dir}/${libraryPrefix}.TTF`,
    }),
    // Variant tracks (BONUS2, LIBBAK) usually have no .TEX overrides; fall
    // through to no per-face overrides if absent.
    fetchOptional(`${dir}/${trackPrefix}.TEX`),
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
  // Track variants (BONUS2, LIBBAK) reuse the parent directory's SCENE/SKY;
  // only the track geometry / texture library differ (handled inside
  // loadTrackData).
  const { dir } = splitVariantPath(trackDir)
  const [scene, sky, ships, track] = await Promise.all([
    loadObjectBundle(`${dir}/SCENE.CMP`, `${dir}/SCENE.PRM`),
    loadObjectBundle(`${dir}/SKY.CMP`, `${dir}/SKY.PRM`),
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

// UI asset paths. WOFONT is a standalone TIM (also embedded in STARTWAD.WAD;
// loaded separately as a fallback). MENU.DAT is undocumented and surfaced as
// raw bytes. STARTWAD.WAD is unpacked into its contained TIMs and CMPs via
// our reverse-engineered walker.
const UI_FONT_PATH = 'WIPEOUT2/TEXTURES/WOFONT.TIM'
const UI_MENU_PATH = 'WIPEOUT2/COMMON/MENU.DAT'
const UI_STARTWAD_PATH = 'WIPEOUT2/COMMON/STARTWAD.WAD'

export const loadStartwadAssets = async (): Promise<StartwadAssets> => {
  const reader = await getReader()
  const startwadBytes = await fetchOptional(UI_STARTWAD_PATH)

  const images: Record<string, DecodedImage> = {}
  const atlases: Record<string, DecodedImage[]> = {}

  if (!startwadBytes) {
    return { atlases, images }
  }

  for (const entry of unpackStartwad(startwadBytes)) {
    try {
      if (entry.extension === 'tim') {
        images[entry.stem] = reader.decode_image(entry.bytes) as DecodedImage
      } else if (entry.extension === 'cmp') {
        atlases[entry.stem] = await decodeImages(entry.bytes)
      }
      // PRMs in STARTWAD (rock, mine, miss, shld, ebolt, sroid, light)
      // overlap with the COMMON/*.PRM files we already load via extras —
      // skip here to avoid duplicate decoding.
    } catch (e) {
      console.warn(`[ui] STARTWAD ${entry.name} decode failed:`, e)
    }
  }

  return { atlases, images }
}

const loadUiRest = async (startwad: StartwadAssets): Promise<UiAssets> => {
  const reader = await getReader()
  const [fontBytes, menu] = await Promise.all([
    fetchOptional(UI_FONT_PATH),
    fetchOptional(UI_MENU_PATH),
  ])

  const images: Record<string, DecodedImage> = { ...startwad.images }

  // Standalone WOFONT.TIM — always preferred over the STARTWAD copy if present.
  if (fontBytes) {
    try {
      images.wofont = reader.decode_image(fontBytes) as DecodedImage
    } catch (e) {
      console.warn(`[ui] ${UI_FONT_PATH} decode failed:`, e)
    }
  }

  return { atlases: startwad.atlases, images, menu }
}

export const loadExtras = async (startwad: StartwadAssets): Promise<ExtrasData> => {
  const { cmpPaths, prmPaths } = collectExtraPaths()

  const [cmpEntries, prmEntries, ui] = await Promise.all([
    Promise.all(cmpPaths.map(loadCmp)),
    Promise.all(prmPaths.map(loadPrm)),
    loadUiRest(startwad),
  ])

  const cmpCache: CmpCache = Object.fromEntries(cmpEntries)
  const prmCache: PrmCache = Object.fromEntries(prmEntries)

  return {
    geometry: assembleGeometry(cmpCache, prmCache),
    textures: assembleTextures(cmpCache),
    ui,
  }
}
