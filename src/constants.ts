import { Quaternion, Vector3 } from 'three'

// ─── Math / fixed vectors ────────────────────────────────────────────────
export const TWO_PI = Math.PI * 2
export const CORRECTION = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI)

// ─── Levels ──────────────────────────────────────────────────────────────
export const LEVEL_PATHS = [
  'WIPEOUT2/TRACK01',
  'WIPEOUT2/TRACK02',
  'WIPEOUT2/TRACK04',
  'WIPEOUT2/TRACK06',
  'WIPEOUT2/TRACK07',
  'WIPEOUT2/TRACK08',
  'WIPEOUT2/TRACK13',
  'WIPEOUT2/TRACK17',
  'WIPEOUT2/TRACK20',
]
export const TOTAL_LOAD_STEPS = LEVEL_PATHS.length + 1
export const LEVEL_ADVANCE_STRENGTH = 0.6

// ─── Track tile visuals ──────────────────────────────────────────────────
export const HOT_COLOR: [number, number, number] = [2.5, 1.2, 0.4]
export const BOOST_FALLOFF = 4
export const WEAPON_FALLOFF = 3.5
export const WEAPON_CYCLE_LENGTH = 6
export const WEAPON_CYCLE_BRIGHTNESS = 2.5
export const WEAPON_BASS_LIFT_GAIN = 0.3

// ─── Spline debug ────────────────────────────────────────────────────────
export const SPLINE_DEBUG_PRIMARY = 0xff00ff
export const SPLINE_DEBUG_ALTERNATE = 0x00ffff
export const SPLINE_DEBUG_RADIUS = 30
export const SPLINE_DEBUG_RADIAL_SEGMENTS = 8
export const SPLINE_DEBUG_TUBULAR_SEGMENTS = 1024

// ─── Scene: beat-light intensity ─────────────────────────────────────────
export const BEAT_LIGHT_INTENSITY = 3

// ─── Scene: oil-pump nod ─────────────────────────────────────────────────
export const OIL_PUMP_FREQ_HZ = 0.125
export const OIL_PUMP_AMPLITUDE = 1

// ─── Scene: fan spin ─────────────────────────────────────────────────────
export const FAN_SPEED_RAD_PER_SEC = 4

// ─── Scene: start-boom countdown loop ────────────────────────────────────
export const START_BOOM_STAGE_SECONDS = 1
export const START_BOOM_STAGE_COUNT = 4
export const START_BOOM_GREY: [number, number, number] = [0x20 / 0xff, 0x20 / 0xff, 0x20 / 0xff]
export const START_BOOM_RED: [number, number, number] = [1, 0, 0]
export const START_BOOM_ORANGE: [number, number, number] = [1, 0x80 / 0xff, 0]
export const START_BOOM_GREEN: [number, number, number] = [0, 1, 0]

// ─── Sky ─────────────────────────────────────────────────────────────────
export const SKY_FADE_SECONDS = 5

// ─── Camera ──────────────────────────────────────────────────────────────
export const CAMERA_BACK_OFFSET = 500
export const CAMERA_UP_OFFSET = 100
export const CAMERA_TANGENT_LAG = 0.006

// ─── Ships: grid / racing ────────────────────────────────────────────────
export const RACER_COUNT = 8
export const GRID_COLS = 2
export const GRID_ROW_GAP = 0.005
export const GRID_COL_WIDTH = 500
export const BASE_SPEED = 0.02
export const SHIP_HOVER_HEIGHT = 200
export const PRIMARY_ROUTE_PROBABILITY = 0.66

// ─── Ships: audio reactivity ─────────────────────────────────────────────
export const BASS_GAIN = 0.35
export const KICK_GAIN = 0.45
export const BAR_GAIN = 0.15
export const BOOST_TILE_GAIN = 2
export const BOOST_DURATION = 2
export const BOOST_RAMP_UP_LERP = 10
export const BOOST_RAMP_DOWN_LERP = 2

// ─── Ships: banking and pitch ────────────────────────────────────────────
export const LOOK_AHEAD = 0.006
export const ROLL_GAIN = 8
export const MAX_ROLL = 0.45
export const ROLL_LERP = 6
export const LAUNCH_ANGLE = (22 * Math.PI) / 180
export const AIR_GRAVITY = 400
export const MAX_PITCH = 0.55
export const MAX_ORIENT_PITCH = Math.PI / 4
export const PITCH_LERP = 8

// ─── Ships: wall collision ───────────────────────────────────────────────
export const WALL_PADDING = 60
export const WALL_STRESS_DECAY = 1.5
export const SEVERE_WALL_VELOCITY = 5000

// ─── Ships: warp transition ──────────────────────────────────────────────
export const WARP_OUT_DURATION = 0.5
export const WARP_IN_DURATION = 0.5
export const INCOMING_DELAY = 0.25 * WARP_OUT_DURATION
export const WARP_FLY_DISTANCE = 60

// ─── Plume ───────────────────────────────────────────────────────────────
export const BOOST_FACTOR_LERP = 6
export const PLUME_BOOST_BPM = 140

export const PLUME_BPM_TRAIL_LENGTH: Record<number, number> = {
  0: 0,
  60: 400,
  100: 800,
  120: 1000,
  140: 1600,
}

export const PLUME_BPM_FLARE_SIZE: Record<number, number> = {
  0: 28,
  60: 28,
  100: 35,
  140: 55,
}

export const PLUME_BPM_COLOR: Record<number, [number, number, number]> = {
  0: [0.05, 0.12, 0.45],
  60: [0.05, 0.12, 0.45],
  100: [0.1, 0.4, 1.2],
  140: [0.1, 0.4, 1.2],
}
