import type { MeydaFeaturesObject } from 'meyda'
import type { MeydaAnalyzer } from 'meyda/dist/esm/meyda-wa'

import Meyda from 'meyda'

import {
  BAND_COUNT,
  BAND_SMOOTH,
  BASS_BANDS,
  BASS_NORMALIZE,
  BUFFER_SIZE,
  MID_BANDS,
  MID_NORMALIZE,
  TREBLE_BANDS,
  TREBLE_NORMALIZE,
} from '../constants'
import { audioState } from '../state'

export type Bands = { bass: number; mid: number; treble: number }

export type Extractor = {
  onFrame: (callback: FrameListener) => () => void
  start: () => void
  stop: () => void
}

export type ExtractorFrame = {
  bands: Bands
  bark: Float32Array
  rms: number
  time: number
}

type FrameListener = (frame: ExtractorFrame) => void

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

const sumBand = (bands: Float32Array, range: [number, number]): number => {
  let sum = 0

  for (let i = range[0]; i < range[1]; i++) {
    sum += bands[i]
  }

  return sum / (range[1] - range[0])
}

const extractBands = (specific: Float32Array): Bands => ({
  bass: Math.min(1, sumBand(specific, BASS_BANDS) / BASS_NORMALIZE),
  mid: Math.min(1, sumBand(specific, MID_BANDS) / MID_NORMALIZE),
  treble: Math.min(1, sumBand(specific, TREBLE_BANDS) / TREBLE_NORMALIZE),
})

const writeSmoothedBands = (bands: Bands, rms: number): void => {
  audioState.bass = lerp(audioState.bass, bands.bass, BAND_SMOOTH)
  audioState.mid = lerp(audioState.mid, bands.mid, BAND_SMOOTH)
  audioState.treble = lerp(audioState.treble, bands.treble, BAND_SMOOTH)
  audioState.rms = rms
}

export const createExtractor = (audioContext: AudioContext, source: AudioNode): Extractor => {
  let analyzer: MeydaAnalyzer | null = null
  const listeners = new Set<FrameListener>()

  const handle = (features: Partial<MeydaFeaturesObject>): void => {
    const loudness = features.loudness

    if (!loudness) {
      return
    }

    const bark = loudness.specific
    const bands = extractBands(bark)
    const rms = features.rms ?? audioState.rms

    writeSmoothedBands(bands, rms)

    const frame: ExtractorFrame = { bands, bark, rms, time: audioContext.currentTime }

    for (const listener of listeners) {
      listener(frame)
    }
  }

  return {
    onFrame: (callback) => {
      listeners.add(callback)

      return () => {
        listeners.delete(callback)
      }
    },
    start: () => {
      analyzer = Meyda.createMeydaAnalyzer({
        audioContext,
        bufferSize: BUFFER_SIZE,
        callback: handle,
        featureExtractors: ['rms', 'loudness'],
        numberOfBarkBands: BAND_COUNT,
        source: source as never,
      })
      analyzer.start()
    },
    stop: () => {
      analyzer?.stop()
      analyzer = null
      listeners.clear()
    },
  }
}
