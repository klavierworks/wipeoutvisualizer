import { audioState } from '../../audio'
import { COUNTDOWN_AUDIO_RMS_THRESHOLD } from '../../constants'

export type CountdownState = 'green' | 'red' | 'yellow'

let hasEverBeenGreen = false
let hasEverBeenYellow = false
let greenAt: null | number = null

export const calculateCountdownState = (): CountdownState => {
  if (hasEverBeenGreen) {
    return 'green'
  }

  if (!hasEverBeenYellow && audioState.rms < COUNTDOWN_AUDIO_RMS_THRESHOLD) {
    return 'red'
  }

  if (audioState.bpm > 0) {
    hasEverBeenGreen = true
    greenAt = audioState.time

    return 'green'
  }

  hasEverBeenYellow = true

  return 'yellow'
}

export const resetCountdown = (): void => {
  hasEverBeenGreen = false
  hasEverBeenYellow = false
  greenAt = null
}

export const getSecondsSinceGreen = (): null | number => {
  if (greenAt === null) {
    return null
  }

  return audioState.time - greenAt
}

export const isRacing = (): boolean => calculateCountdownState() === 'green'
