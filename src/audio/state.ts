export type AudioState = {
  bar: number
  barPhase: number
  bass: number
  beat: number

  beatPhase: number
  bpm: number

  duration: number
  isPlaying: boolean
  isReady: boolean
  kick: number
  mid: number
  rms: number
  sectionIndex: number

  sections: SectionInfo[]
  sectionStart: number
  sectionTime: number
  snare: number

  time: number
  treble: number
}

export type SectionInfo = {
  bpm: number
  duration: number
  start: number
  strength: number
}

export const audioState: AudioState = {
  bar: 0,
  barPhase: 0,
  bass: 0,
  beat: 0,
  beatPhase: 0,
  bpm: 120,
  duration: 0,
  isPlaying: false,
  isReady: false,
  kick: 0,
  mid: 0,
  rms: 0,
  sectionIndex: 0,
  sections: [],
  sectionStart: 0,
  sectionTime: 0,
  snare: 0,
  time: 0,
  treble: 0,
}
