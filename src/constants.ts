import { Color, Quaternion, Vector3 } from 'three'

// ─── Math / fixed vectors ────────────────────────────────────────────────
export const TWO_PI = Math.PI * 2
export const CORRECTION = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI)

// ─── Levels ──────────────────────────────────────────────────────────────
// Path-suffix variants:
//   "/BONUS2" reuses the parent dir's SCENE / SKY / LIBRARY but substitutes
//   BONUS2.TRV/.TRF/.TRS for the track geometry. Currently only TRACK04
//   ships one.
//   "/LIBBAK" keeps the parent's track geometry and SCENE / SKY but swaps in
//   LIBBAK.CMP / LIBBAK.TTF as an alt-themed texture set. Currently only
//   TRACK02 ships one.
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
  'WIPEOUT2/TRACK04/BONUS2',
  'WIPEOUT2/TRACK02/LIBBAK',
]
// Per-track index (in the source TRS section ordering) of the start line.
// Phoboslab/wipeout-rewrite stores the equivalent as `start_line_pos` in
// game.c per circuit/race-class; WipEout 2 has no published table, so values
// here are placeholders to be filled in by reading the on-track section
// labels rendered by the SectionLabels debug component.
export const START_LINE_SECTION_BY_TRACK: Record<string, number> = {
  'WIPEOUT2/TRACK01': 0,
  'WIPEOUT2/TRACK02': 40,
  'WIPEOUT2/TRACK04': 0,
  'WIPEOUT2/TRACK04/BONUS2': 0,
  'WIPEOUT2/TRACK06': 17,
  'WIPEOUT2/TRACK07': 79,
  'WIPEOUT2/TRACK08': 1,
  'WIPEOUT2/TRACK13': 11,
  'WIPEOUT2/TRACK17': 7,
  'WIPEOUT2/TRACK20': 17,
}
export const TOTAL_LOAD_STEPS = LEVEL_PATHS.length + 1
export const LEVEL_ADVANCE_STRENGTH = 0.6

// ─── Loading: ?fakeloading=true ──────────────────────────────────────────
// Per-phase delays injected when the URL flag is set, so we can eyeball
// each stage of the loading UI without rebuilding gamefiles.
export const FAKE_LOAD_REACT_MS = 5000
export const FAKE_LOAD_STARTWAD_MS = 10000
export const FAKE_LOAD_LEVELS_MS = 10000

// ─── Track tile visuals ──────────────────────────────────────────────────
export const HOT_COLOR: [number, number, number] = [2.5, 1.2, 0.4]
export const BOOST_FALLOFF = 4
export const WEAPON_FALLOFF = 3.5

// ─── Start gantry ────────────────────────────────────────────────────────
// Height above the track surface to anchor the floating-lights gantry. Ship
// hover is 200 and the gantry mesh is ~850 units tall, so 700 puts the arch
// well clear of the ships at idle.
export const START_GANTRY_HEIGHT = 1500
export const START_GANTRY_DISTANCE = 4000;
// Countdown light tints — phoboslab/wipeout-rewrite scene.c:148-183.
export const COUNTDOWN_RED = new Color(0xff0000)
export const COUNTDOWN_YELLOW = new Color(0xff8000)
export const COUNTDOWN_GREEN = new Color(0x00ff00)
// RMS level above which we consider audio to be coming in (vs. silence).
export const COUNTDOWN_AUDIO_RMS_THRESHOLD = 0.01

// ─── Ship-vs-ship collision ──────────────────────────────────────────────
// Sphere radius (in world / PRM units) used for broadphase distance check.
// Ship meshes are ~360 wide, halved by the racer group's 0.5 scale, so 180
// is a tight fit; bumping to 220 leaves a sliver of buffer for visual spacing.
export const COLLISION_RADIUS = 220
// Lateral lane impulse on contact, before the racer-pair scaling.
export const COLLISION_LANE_IMPULSE = 90
// Exponential decay rate (per second) for collisionLaneOffset. e^(-dt*5)
// fades a 90-unit nudge to ~6 over half a second — feels like a sideswipe
// rather than a permanent sidestep.
export const COLLISION_OFFSET_DECAY = 5
export const WEAPON_CYCLE_LENGTH = 6
export const WEAPON_CYCLE_BRIGHTNESS = 2.5
export const WEAPON_BASS_LIFT_GAIN = 0.3

// ─── Spline debug ────────────────────────────────────────────────────────
export const SPLINE_DEBUG_PRIMARY = 0xff00ff
export const SPLINE_DEBUG_ALTERNATE = 0x00ffff
export const SPLINE_DEBUG_RADIUS = 30
export const SPLINE_DEBUG_RADIAL_SEGMENTS = 8
export const SPLINE_DEBUG_TUBULAR_SEGMENTS = 1024

// ─── Section labels (debug) ──────────────────────────────────────────────
export const SECTION_LABEL_HEIGHT = 1500
export const SECTION_LABEL_FONT_SIZE = 200
export const SECTION_LABEL_COLOR = '#ffff00'

// ─── Scene: beat-light intensity ─────────────────────────────────────────
export const BEAT_LIGHT_INTENSITY = 3

// ─── Scene: oil-pump nod ─────────────────────────────────────────────────
export const OIL_PUMP_FREQ_HZ = 0.125
export const OIL_PUMP_AMPLITUDE = 1

// ─── Scene: fan spin ─────────────────────────────────────────────────────
export const FAN_SPEED_RAD_PER_SEC = 4

// ─── Sky ─────────────────────────────────────────────────────────────────
export const SKY_FADE_SECONDS = 5

// ─── Camera ──────────────────────────────────────────────────────────────
export const CAMERA_BACK_OFFSET = 500
export const CAMERA_UP_OFFSET = 100
export const CAMERA_TANGENT_LAG = 0.006

// ─── Ships: grid / racing ────────────────────────────────────────────────
export const RACER_COUNT = 8
// Single-file zig-zag grid: one ship per row, alternating left/right each row
// (row 0 = pole on the right, row 1 left, row 2 right, ...). LANE_WIDTH is
// the full lateral distance between the two lanes (world units).
// ROW_GAP_SECTIONS is the longitudinal spacing between rows in source-track
// section units, converted to spline-t per track at config time.
export const START_GRID_LANE_WIDTH = 2000
export const START_GRID_ROW_GAP_SECTIONS = 2
export const BASE_SPEED = 0.02
export const SHIP_HOVER_HEIGHT = 200
export const PRIMARY_ROUTE_PROBABILITY = 0.66
// Rubber-band that pulls the player toward the pack median: each frame we
// add `gain * signedGapToMedian` to the player's mean speed factor (clamped
// to ±MAX). Positive gap = median is ahead → speed up; negative = player is
// ahead → slow down. Replaces a constant +bias which let the player drift
// permanently to the front. Other ships keep mean = 1.
export const LEADER_PACK_BIAS_GAIN = 0.6
export const LEADER_PACK_BIAS_MAX = 0.04
// Speed ramp is the per-ship `launchProgress` factor on speedFactor; the lane
// fade is the cross-blend in splineLane that pulls ships off the wide start
// grid back toward the race line. Split so a snappy launch can pair with a
// slow, dramatic lateral settle.
export const LAUNCH_RAMP_LERP = 0.2
export const START_LANE_FADE_LERP = 0.1

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

// ─── Reactivity: section energy ──────────────────────────────────────────
export const SECTION_ENERGY_RMS_GAIN = 4
export const SECTION_ENERGY_RMS_WEIGHT = 0.7
export const SECTION_ENERGY_STRENGTH_WEIGHT = 0.3
export const SECTION_ENERGY_LERP = 1.5

// ─── Reactivity: ship speed ──────────────────────────────────────────────
export const SHIP_SPEED_QUIET_MULTIPLIER = 0.75
export const SHIP_SPEED_LOUD_MULTIPLIER = 1.35

// ─── Reactivity: ship speed by BPM ───────────────────────────────────────
export const SHIP_BPM_SPEED_MULTIPLIER: Record<number, number> = {
  0: 0,
  60: 0.9,
  100: 1.5,
  120: 1.6,
  140: 1.6,
}
export const SHIP_BPM_SPEED_LERP = 0.6

// ─── Reactivity: chase camera ────────────────────────────────────────────
export const CAMERA_FOV_BASE = 60
export const CAMERA_FOV_BASS_RANGE = 2
export const CAMERA_FOV_LERP = 3
export const CAMERA_KICK_SHAKE_THRESHOLD = 0.7
export const CAMERA_KICK_SHAKE_MAGNITUDE = 12
export const CAMERA_KICK_SHAKE_DECAY = 6

// ─── Reactivity: ship bank on kick ───────────────────────────────────────
export const SHIP_BANK_KICK_THRESHOLD = 0.6
export const SHIP_BANK_KICK_AMOUNT = 0.05
export const SHIP_BANK_KICK_DECAY = 8

// ─── Reactivity: beat lights downbeat emphasis ───────────────────────────
export const BEAT_LIGHT_DOWNBEAT_BONUS = 0.6

// ─── Reactivity: weapon tiles snare drive ────────────────────────────────
export const WEAPON_SNARE_THRESHOLD = 0.45

// ─── Reactivity: boost tiles kick drive ──────────────────────────────────
export const BOOST_KICK_THRESHOLD = 0.55
export const BOOST_KICK_TILE_FRACTION = 0.25

// ─── Reactivity: sky section-energy tint ─────────────────────────────────
export const SKY_TINT_QUIET = 0.78
export const SKY_TINT_LOUD = 1.12

// ─── Plume ───────────────────────────────────────────────────────────────
export const BOOST_FACTOR_LERP = 6
export const PLUME_BOOST_BPM = 140
export const ENGINE_TEXTURE_INDEX = 16
export const ENGINE_CLUSTER_RADIUS = 50

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

// ─── Plume: bass overlay (in-song dynamics on top of BPM map) ────────────
export const PLUME_BASS_TRAIL_GAIN = 200
export const PLUME_BASS_FLARE_GAIN = 8

// ─── Track names ─────────────────────────────────────────────────────────
// Mapping from LEVEL_PATHS entries to in-game circuit names. WipEout 2097 /
// XL track folder → name mapping cross-referenced from wipeoutzone.com forum
// research. TRACK04 is the unfinished hidden circuit (no canonical name);
// BONUS2 is its dropped bonus variant; LIBBAK is an alt-textured TRACK02.
export const TRACK_NAMES: Record<string, string> = {
  'WIPEOUT2/TRACK01': "Talon's Reach",
  'WIPEOUT2/TRACK02': "Gare d'Europa",
  'WIPEOUT2/TRACK02/LIBBAK': "Gare d'Europa (Alt)",
  'WIPEOUT2/TRACK04': 'Hidden Circuit',
  'WIPEOUT2/TRACK04/BONUS2': 'Hidden Circuit (Bonus)',
  'WIPEOUT2/TRACK06': 'Vostok Island',
  'WIPEOUT2/TRACK07': 'Spilskinanke',
  'WIPEOUT2/TRACK08': 'Sagarmatha',
  'WIPEOUT2/TRACK13': 'Valparaiso',
  'WIPEOUT2/TRACK17': 'Odessa Keys',
  'WIPEOUT2/TRACK20': 'Phenitia Park',
}

// ─── Ship names ──────────────────────────────────────────────────────────
// Indices into the ship-mesh pool loaded from WIPEOUT2/COMMON/TERRY.PRM.
// Order assumed from phoboslab/wipeout-rewrite's WipEout 1 team enum
// (AG_SYSTEMS, AURICOM, QIREX, FEISAR) with PIRANHA appended as the new
// 2097 team. Adjust if TERRY.PRM dumps disagree with on-screen ships.
export const SHIP_NAMES: Record<number, string> = {
  0: 'AG Systems',
  1: 'Auricom',
  2: 'Qirex',
  3: 'Feisar',
  4: 'Piranha',
}