import { Vector3 } from 'three'

// ─── Math ────────────────────────────────────────────────────────────────
export const UP = new Vector3(0, 1, 0)

// ─── Track: face flags / geometry orderings ──────────────────────────────
export const TRACK_FACE_FLAG_TRACK = 1
export const TRACK_FACE_FLAG_FLIP = 4
export const TRACK_FACE_FLAG_BOOST = 32
export const TRACK_TEXTURE_GRID = 4
export const TRACK_QUAD_ORDER: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [2, 3, 0],
]
export const QUAD_ORDER: readonly (readonly [number, number, number])[] = [
  [2, 1, 0],
  [2, 3, 1],
]
export const TRI_ORDER: readonly (readonly [number, number, number])[] = [[2, 1, 0]]
export const BOOST_TAG_PREFIX = 'boost:'
export const WEAPON_TAG = 'weapon'
export const WEAPON_TILE_INDEX = 3

// ─── Color decoding ──────────────────────────────────────────────────────
export const WIPEOUT_COLOR_DIVISOR = 0x80

// ─── Track surface defaults ──────────────────────────────────────────────
export const TRACK_BOOST_BASE_COLOR: [number, number, number] = [0.25, 0.25, 2]
export const DEFAULT_TRACK_TILE_SIZE = 32

// ─── Plume geometry ──────────────────────────────────────────────────────
export const PLUME_WIDTH = 20

// ─── Scene name prefixes ─────────────────────────────────────────────────
export const SCENE_NAME_RED_LIGHT_PREFIXES = ['redl', 'redb'] as const
export const SCENE_NAME_WHITE_LIGHT_PREFIXES = ['lightbox', 'nulights', 'gigII'] as const
export const SCENE_NAME_OPACITY_PULSE_PREFIXES = ['alphabill', 'beamer', 'smoke'] as const
export const SCENE_NAME_OIL_PUMP_PREFIXES = ['donkey'] as const
export const SCENE_NAME_START_BOOM_PREFIXES = ['start'] as const
export const SCENE_NAME_STAND_PREFIXES = ['lost', 'stad', 'newstad'] as const
export const SCENE_NAME_FAN_PREFIXES = ['fan'] as const
export const SCENE_NAME_UV_SCROLL_PREFIXES: Record<string, [number, number]> = {
  wfall: [0, -0.5],
}
