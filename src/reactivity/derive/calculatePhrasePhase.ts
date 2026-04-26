import { audioState } from '../../audio'
import { BEATS_PER_BAR } from '../../audio/constants'

export const getBeatInBar = (): number => Math.floor(audioState.beat) % BEATS_PER_BAR

export const getIsDownbeat = (): boolean => getBeatInBar() === 0

export const getBarInPhrase = (phraseBars: number): number => Math.floor(audioState.bar) % phraseBars

export const getPhraseProgress = (phraseBars: number): number => (audioState.bar % phraseBars) / phraseBars
