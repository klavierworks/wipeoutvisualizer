import { audioState } from '../../audio'
import {
  SECTION_ENERGY_LERP,
  SECTION_ENERGY_RMS_GAIN,
  SECTION_ENERGY_RMS_WEIGHT,
  SECTION_ENERGY_STRENGTH_WEIGHT,
} from '../../constants'

let lastSampleTime = -1

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

export const sampleSectionEnergy = (currentTime: number): number => {
  if (lastSampleTime < 0) {
    lastSampleTime = currentTime

    return audioState.sectionEnergy
  }

  const dt = currentTime - lastSampleTime

  if (dt <= 0) {
    return audioState.sectionEnergy
  }

  lastSampleTime = currentTime

  const rmsContribution = clamp01(audioState.rms * SECTION_ENERGY_RMS_GAIN) * SECTION_ENERGY_RMS_WEIGHT
  const strengthContribution = clamp01(audioState.sectionStrength) * SECTION_ENERGY_STRENGTH_WEIGHT
  const target = clamp01(rmsContribution + strengthContribution)
  const alpha = 1 - Math.exp(-dt * SECTION_ENERGY_LERP)

  audioState.sectionEnergy += (target - audioState.sectionEnergy) * alpha

  return audioState.sectionEnergy
}
