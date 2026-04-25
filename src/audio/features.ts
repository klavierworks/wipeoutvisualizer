import type { MeydaFeaturesObject } from 'meyda'
import type { MeydaAnalyzer } from 'meyda/dist/esm/meyda-wa'

import Meyda from 'meyda'

import {
  AVG_SMOOTH,
  BAND_COUNT,
  BAND_SMOOTH,
  BASS_BANDS,
  BASS_NORMALIZE,
  BUFFER_SIZE,
  KICK_FLOOR,
  KICK_THRESHOLD,
  MID_BANDS,
  MID_NORMALIZE,
  MIN_ONSET_INTERVAL_SEC,
  SNARE_FLOOR,
  SNARE_THRESHOLD,
  TREBLE_BANDS,
  TREBLE_NORMALIZE,
} from './constants'
import { audioState } from './state'

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

const sumBand = (bands: Float32Array, range: [number, number]): number => {
  let sum = 0

  for (let i = range[0]; i < range[1]; i++) {
    sum += bands[i]
  }

  return sum / (range[1] - range[0])
}

type Bands = { bass: number; mid: number; treble: number }

const extractBands = (loudness: { specific: Float32Array }): Bands => ({
  bass: Math.min(1, sumBand(loudness.specific, BASS_BANDS) / BASS_NORMALIZE),
  mid: Math.min(1, sumBand(loudness.specific, MID_BANDS) / MID_NORMALIZE),
  treble: Math.min(1, sumBand(loudness.specific, TREBLE_BANDS) / TREBLE_NORMALIZE),
})

const writeSmoothedBands = (bands: Bands, rms: number | undefined): void => {
  audioState.bass = lerp(audioState.bass, bands.bass, BAND_SMOOTH)
  audioState.mid = lerp(audioState.mid, bands.mid, BAND_SMOOTH)
  audioState.treble = lerp(audioState.treble, bands.treble, BAND_SMOOTH)
  audioState.rms = rms ?? audioState.rms
}

type AverageState = { bassAverage: number; trebleAverage: number }

const updateAverages = (averages: AverageState, bands: Bands): void => {
  averages.bassAverage = lerp(averages.bassAverage, bands.bass, AVG_SMOOTH)
  averages.trebleAverage = lerp(averages.trebleAverage, bands.treble, AVG_SMOOTH)
}

type OnsetState = { lastKick: number; lastSnare: number }

const detectKick = (bands: Bands, averages: AverageState, onsets: OnsetState, now: number): void => {
  if (
    bands.bass > averages.bassAverage * KICK_THRESHOLD &&
    bands.bass > KICK_FLOOR &&
    now - onsets.lastKick > MIN_ONSET_INTERVAL_SEC
  ) {
    audioState.kick = 1
    onsets.lastKick = now
  }
}

const detectSnare = (bands: Bands, averages: AverageState, onsets: OnsetState, now: number): void => {
  if (
    bands.treble > averages.trebleAverage * SNARE_THRESHOLD &&
    bands.treble > SNARE_FLOOR &&
    now - onsets.lastSnare > MIN_ONSET_INTERVAL_SEC
  ) {
    audioState.snare = 1
    onsets.lastSnare = now
  }
}

export class FeatureExtractor {
  private analyzer: MeydaAnalyzer | null = null
  private readonly averages: AverageState = { bassAverage: 0, trebleAverage: 0 }
  private readonly onsets: OnsetState = { lastKick: 0, lastSnare: 0 }

  start(context: AudioContext, source: AudioNode) {
    this.analyzer = Meyda.createMeydaAnalyzer({
      audioContext: context,
      bufferSize: BUFFER_SIZE,
      callback: (features: Partial<MeydaFeaturesObject>) => this.handle(features, context.currentTime),
      featureExtractors: ['rms', 'loudness'],
      numberOfBarkBands: BAND_COUNT,
      source: source as never,
    })

    this.analyzer.start()
  }

  stop() {
    this.analyzer?.stop()
    this.analyzer = null
  }

  private handle(features: Partial<MeydaFeaturesObject>, now: number) {
    const loudness = features.loudness

    if (!loudness) {
      return
    }

    const bands = extractBands(loudness)

    writeSmoothedBands(bands, features.rms)
    updateAverages(this.averages, bands)
    detectKick(bands, this.averages, this.onsets, now)
    detectSnare(bands, this.averages, this.onsets, now)
  }
}
