// ─── Offline analysis (worker) ───────────────────────────────────────────
export const BUFFER_SIZE = 512
export const HOP_SAMPLES = 512
export const BAND_COUNT = 24
export const BASS_BANDS: [number, number] = [0, 3]
export const MID_BANDS: [number, number] = [3, 18]
export const TREBLE_BANDS: [number, number] = [18, 24]
export const GLOBAL_MIN_BPM = 60
export const GLOBAL_MAX_BPM = 180
export const MUSICAL_MIN_BPM = 90
export const MUSICAL_MAX_BPM = 175
export const OCTAVE_PROMOTE_RATIO = 0.55
export const TEMPO_WINDOW_SEC = 10
export const TEMPO_HOP_SEC = 2
export const TEMPO_MERGE_BPM = 1
export const SECTION_CONTEXT_SEC = 4
export const SECTION_SMOOTH_SEC = 2
export const SECTION_MIN_SPACING_SEC = 6
export const SECTION_PEAK_THRESHOLD = 0.25
export const MIN_ONSET_INTERVAL_SEC = 0.09
export const ONSET_NEIGHBOR_WINDOW = 20
export const TEMPO_SMOOTH_RADIUS = 1

// ─── Runtime feature extractor / clock ───────────────────────────────────
export const AVG_SMOOTH = 0.02
export const BAND_SMOOTH = 0.35
export const BEATS_PER_BAR = 4
export const KICK_THRESHOLD = 1.35
export const SNARE_THRESHOLD = 1.25
export const KICK_FLOOR = 0.12
export const SNARE_FLOOR = 0.08
export const BASS_NORMALIZE = 6
export const MID_NORMALIZE = 4
export const TREBLE_NORMALIZE = 3
export const PULSE_DECAY = 5
export const RAMP_SEC = 1
