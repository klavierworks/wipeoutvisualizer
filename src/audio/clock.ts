import type { SectionInfo } from './preanalysis/sections'

import { BEATS_PER_BAR, STALE_BEAT_PERIODS } from './constants'
import { audioState } from './state'

export type ClockState = {
  beatCount: number
  bpm: number
  bpmConfidence: number
  lastBeatTime: null | number
}

export type TickHint = {
  section: number
}

export const createClockState = (): ClockState => ({
  beatCount: 0,
  bpm: 0,
  bpmConfidence: 0,
  lastBeatTime: null,
})

export const recordBeat = (state: ClockState, time: number, bpm: number, confidence: number): void => {
  state.beatCount += 1
  state.lastBeatTime = time
  state.bpm = bpm
  state.bpmConfidence = confidence
}

const writeIdle = (state: ClockState): void => {
  state.beatCount = 0
  state.lastBeatTime = null
  state.bpm = 0
  state.bpmConfidence = 0
  audioState.bpm = 0
  audioState.bpmConfidence = 0
  audioState.beat = 0
  audioState.beatPhase = 0
  audioState.bar = 0
  audioState.barPhase = 0
}

export const tickClock = (currentTime: number, state: ClockState): void => {
  audioState.time = currentTime
  audioState.bpm = state.bpm
  audioState.bpmConfidence = state.bpmConfidence

  if (state.lastBeatTime === null || state.bpm <= 0) {
    audioState.beat = 0
    audioState.beatPhase = 0
    audioState.bar = 0
    audioState.barPhase = 0

    return
  }

  const period = 60 / state.bpm
  const elapsed = currentTime - state.lastBeatTime

  if (elapsed > period * STALE_BEAT_PERIODS) {
    writeIdle(state)

    return
  }

  const phase = Math.max(0, Math.min(1, elapsed / period))
  const fractionalBeat = state.beatCount + phase

  audioState.beat = fractionalBeat
  audioState.beatPhase = phase
  audioState.bar = fractionalBeat / BEATS_PER_BAR
  audioState.barPhase = (fractionalBeat % BEATS_PER_BAR) / BEATS_PER_BAR
}

export const tickSectionTime = (currentTime: number): void => {
  audioState.sectionTime = Math.max(0, currentTime - audioState.sectionStart)
}

const findOfflineSectionIndex = (sections: SectionInfo[], currentTime: number, hint: number): number => {
  let index = hint

  if (index < 0 || index >= sections.length) {
    index = 0
  }

  while (index + 1 < sections.length && currentTime >= sections[index + 1].start) {
    index++
  }

  while (index > 0 && currentTime < sections[index].start) {
    index--
  }

  return index
}

export const advanceOfflineSections = (currentTime: number, sections: SectionInfo[], hint: TickHint): TickHint => {
  if (sections.length === 0) {
    return hint
  }

  const index = findOfflineSectionIndex(sections, currentTime, hint.section)

  if (index !== hint.section) {
    const next = sections[index]

    audioState.sectionStart = next.start
    audioState.sectionStrength = next.strength
    audioState.sectionChangeCount += 1
  }

  return { section: index }
}
