import { useEffect, useState } from 'react'

import { audioState, type AudioState } from '../../../audio/state'
import { formatRemaining } from './formatRemaining'

export type HudReadouts = {
  sectionRemaining: string
  snapshot: AudioState
  tempo: number
  trackRemaining: string
}

const buildReadouts = (): HudReadouts => {
  const section = audioState.sections[audioState.sectionIndex]
  const sectionLeft = section ? section.duration - audioState.sectionTime : 0

  return {
    sectionRemaining: formatRemaining(sectionLeft),
    snapshot: audioState,
    tempo: Math.round(audioState.bpm),
    trackRemaining: formatRemaining(audioState.duration - audioState.time),
  }
}

export const useHudReadouts = (): HudReadouts => {
  const [readouts, setReadouts] = useState<HudReadouts>(buildReadouts)

  useEffect(() => {
    let frame = 0

    const tick = () => {
      setReadouts(buildReadouts())
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [])

  return readouts
}
