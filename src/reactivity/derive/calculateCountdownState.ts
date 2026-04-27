import { audioState } from '../../audio'
import { COUNTDOWN_AUDIO_RMS_THRESHOLD } from '../../constants'

export type CountdownState = 'green' | 'red' | 'yellow'

let hasEverBeenGreen = false
let hasEverBeenYellow = false

export const calculateCountdownState = (): CountdownState => {
  if (hasEverBeenGreen) {
    return 'green'
  }

  if (!hasEverBeenYellow && audioState.rms < COUNTDOWN_AUDIO_RMS_THRESHOLD) {
    return 'red'
  }

  if (audioState.bpm > 0) {
    hasEverBeenGreen = true

    return 'green'
  }

  hasEverBeenYellow = true

  return 'yellow'
}

export const isRacing = (): boolean => calculateCountdownState() === 'green'
