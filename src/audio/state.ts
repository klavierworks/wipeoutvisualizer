export type AudioState = {
  bar: number
  barPhase: number
  bass: number
  beat: number
  beatPhase: number
  bpm: number
  bpmConfidence: number
  duration: null | number
  isPlaying: boolean
  isReady: boolean
  kick: number
  mid: number
  onset: number
  rms: number
  sectionChangeCount: number
  sectionStart: number
  sectionStrength: number
  sectionTime: number
  snare: number
  sourceKind: SourceKind
  time: number
  treble: number
}

export type SourceKind = 'file' | 'mic'

export const audioState: AudioState = {
  bar: 0,
  barPhase: 0,
  bass: 0,
  beat: 0,
  beatPhase: 0,
  bpm: 0,
  bpmConfidence: 0,
  duration: null,
  isPlaying: false,
  isReady: false,
  kick: 0,
  mid: 0,
  onset: 0,
  rms: 0,
  sectionChangeCount: 0,
  sectionStart: 0,
  sectionStrength: 0,
  sectionTime: 0,
  snare: 0,
  sourceKind: 'file',
  time: 0,
  treble: 0,
}
