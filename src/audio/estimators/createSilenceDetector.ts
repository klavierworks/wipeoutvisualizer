import type { ExtractorFrame } from '../features/createExtractor'

import { SILENCE_HOLD_SEC, SILENCE_RMS_THRESHOLD } from '../constants'

export type SilenceChange = {
  isLoud: boolean
  time: number
}

export type SilenceDetector = {
  feedFrame: (frame: ExtractorFrame) => void
  onChange: (callback: SilenceChangeListener) => () => void
}

type SilenceChangeListener = (change: SilenceChange) => void

export const createSilenceDetector = (): SilenceDetector => {
  const listeners = new Set<SilenceChangeListener>()

  let confirmedIsLoud: boolean | null = null
  let pendingSince: null | number = null

  const fire = (change: SilenceChange): void => {
    for (const listener of listeners) {
      listener(change)
    }
  }

  return {
    feedFrame: (frame) => {
      const isLoud = frame.rms >= SILENCE_RMS_THRESHOLD

      if (confirmedIsLoud === null) {
        confirmedIsLoud = isLoud

        return
      }

      if (isLoud === confirmedIsLoud) {
        pendingSince = null

        return
      }

      if (pendingSince === null) {
        pendingSince = frame.time

        return
      }

      if (frame.time - pendingSince < SILENCE_HOLD_SEC) {
        return
      }

      confirmedIsLoud = isLoud
      pendingSince = null
      fire({ isLoud, time: frame.time })
    },
    onChange: (callback) => {
      listeners.add(callback)

      return () => {
        listeners.delete(callback)
      }
    },
  }
}
