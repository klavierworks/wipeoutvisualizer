import { useEffect, useState } from 'react'

import type { SectionInfo } from '../../../audio/preanalysis/sections'

import { audioState, type AudioState } from '../../../audio/state'
import { formatRemaining } from './formatRemaining'

export type HudReadouts = {
  sectionRemaining: string
  snapshot: AudioState
  tempo: string
  trackRemaining: string
}

const PLACEHOLDER = '—'

const findCurrentSection = (sections: SectionInfo[], time: number): null | SectionInfo => {
  for (let i = sections.length - 1; i >= 0; i--) {
    if (time >= sections[i].start) {
      return sections[i]
    }
  }

  return null
}

const computeSectionRemaining = (offlineSections: null | SectionInfo[]): string => {
  if (!offlineSections) {
    return PLACEHOLDER
  }

  const section = findCurrentSection(offlineSections, audioState.time)

  if (!section) {
    return PLACEHOLDER
  }

  const timeIntoSection = audioState.time - section.start
  const left = Math.max(0, section.duration - timeIntoSection)

  return formatRemaining(left)
}

const computeTrackRemaining = (): string => {
  if (audioState.duration === null) {
    return PLACEHOLDER
  }

  return formatRemaining(audioState.duration - audioState.time)
}

const computeTempo = (): string => (audioState.bpm > 0 ? String(Math.round(audioState.bpm)) : PLACEHOLDER)

const buildReadouts = (offlineSections: null | SectionInfo[]): HudReadouts => ({
  sectionRemaining: computeSectionRemaining(offlineSections),
  snapshot: audioState,
  tempo: computeTempo(),
  trackRemaining: computeTrackRemaining(),
})

export const useHudReadouts = (offlineSections: null | SectionInfo[]): HudReadouts => {
  const [readouts, setReadouts] = useState<HudReadouts>(() => buildReadouts(offlineSections))

  useEffect(() => {
    let frame = 0

    const tick = () => {
      setReadouts(buildReadouts(offlineSections))
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [offlineSections])

  return readouts
}
