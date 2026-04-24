// Per-section metadata, computed once at load time from the offline analysis.
// Consumers can read details for any section, or look up the current one with
// `audioState.sections[audioState.sectionIndex]`.
export type SectionInfo = {
  start: number       // absolute time of the section's start (seconds)
  duration: number    // length until the next section, or end of track (seconds)
  bpm: number         // dominant bpm during the section
  strength: number    // novelty strength at the boundary (0..1)
}

export type AudioState = {
  // Raw realtime features, smoothed to 0..~1.
  rms: number
  bass: number
  mid: number
  treble: number

  // Transient pulses. Jump to 1 on onset, decay toward 0.
  kick: number
  snare: number

  // Musical clock.
  time: number
  duration: number          // total track length in seconds
  bpm: number
  beat: number
  beatPhase: number
  bar: number
  barPhase: number

  // Structural position.
  sectionIndex: number       // integer counter, increments at each boundary
  sectionTime: number        // seconds since the current section began
  sectionStart: number       // absolute time of the current section's start
  sections: SectionInfo[]    // metadata for every section in the track

  // Lifecycle.
  ready: boolean
  playing: boolean
}

// Single mutable singleton. R3F components read this directly inside useFrame —
// no React state, no re-renders, no allocations per frame.
export const audioState: AudioState = {
  rms: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  kick: 0,
  snare: 0,
  time: 0,
  duration: 0,
  bpm: 120,
  beat: 0,
  beatPhase: 0,
  bar: 0,
  barPhase: 0,
  sectionIndex: 0,
  sectionTime: 0,
  sectionStart: 0,
  sections: [],
  ready: false,
  playing: false,
}
