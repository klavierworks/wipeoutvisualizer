// ─── Offline analysis (worker) ───────────────────────────────────────────
export const BUFFER_SIZE = 512
export const HOP_SAMPLES = 512
export const BAND_COUNT = 24
export const BASS_BANDS: [number, number] = [0, 3]
export const MID_BANDS: [number, number] = [3, 18]
export const TREBLE_BANDS: [number, number] = [18, 24]
export const SECTION_CONTEXT_SEC = 4
export const SECTION_SMOOTH_SEC = 2
export const SECTION_MIN_SPACING_SEC = 6
export const SECTION_PEAK_THRESHOLD = 0.25
export const MIN_ONSET_INTERVAL_SEC = 0.09
export const ONSET_NEIGHBOR_WINDOW = 20

// ─── Runtime feature extractor ───────────────────────────────────────────
export const AVG_SMOOTH = 0.02
export const BAND_SMOOTH = 0.35
export const BEATS_PER_BAR = 4
export const KICK_THRESHOLD = 1.35
export const SNARE_THRESHOLD = 1.25
export const KICK_FLOOR = 0.12
export const SNARE_FLOOR = 0.08
export const KICK_FLOOR_FRACTION_OF_RMS = 0.6
export const SNARE_FLOOR_FRACTION_OF_RMS = 0.5
export const RUNNING_RMS_SMOOTH = 0.005
export const BASS_NORMALIZE = 6
export const MID_NORMALIZE = 4
export const TREBLE_NORMALIZE = 3
export const PULSE_DECAY = 5

// ─── Streaming section detector ──────────────────────────────────────────
export const SECTION_HISTORY_BARS = 7
export const SECTION_THRESHOLD_HIGH = 0.18
export const SECTION_THRESHOLD_LOW = 0.1
export const STREAMING_SECTION_MIN_SPACING_SEC = 8
export const SECTION_RMS_FLOOR = 0.005
export const SECTION_DEFAULT_BAR_SEC = 2
export const SECTION_STRENGTH_NORMALIZE = 0.4

// ─── Aubio streaming beat tracker ────────────────────────────────────────
export const AUBIO_BUFFER_SIZE = 1024
export const AUBIO_HOP_SIZE = 512
export const STALE_BEAT_PERIODS = 4
