import Meyda from 'meyda'
import type { MeydaFeaturesObject } from 'meyda'
import type { MeydaAnalyzer } from 'meyda/dist/esm/meyda-wa'
import { audioState } from './state'

// Realtime feature extraction. Tapped on the audio source via Meyda.
// Writes smoothed band energies + fires onset pulses directly onto audioState.
//
// The Meyda callback runs at ~86Hz (sampleRate / bufferSize with 512 samples);
// the R3F frame loop is typically 60Hz and separately decays the pulses.

const BUFFER_SIZE = 512

// Meyda's loudness returns 24 Bark bands. Low bands carry the kick/bass, the
// top bands carry cymbals/hats. Splitting band-wise lets us onset-detect each
// region independently instead of chasing overall RMS.
const BAND_COUNT = 24
const BASS_BANDS: [number, number] = [0, 3]
const MID_BANDS: [number, number] = [3, 18]
const TREBLE_BANDS: [number, number] = [18, 24]

// Smoothing coefficients. Higher = snappier but noisier.
const BAND_SMOOTH = 0.35
const AVG_SMOOTH = 0.02

// Onset detection: a band fires a pulse when its current value exceeds a
// running average by the threshold AND we haven't fired too recently.
const KICK_THRESHOLD = 1.35
const SNARE_THRESHOLD = 1.25
const MIN_ONSET_INTERVAL_SEC = 0.09

const sumBand = (bands: Float32Array, range: [number, number]) => {
  let sum = 0
  for (let i = range[0]; i < range[1]; i++) sum += bands[i]
  return sum / (range[1] - range[0])
}

export class FeatureExtractor {
  private analyzer: MeydaAnalyzer | null = null
  private bassAvg = 0
  private trebleAvg = 0
  private lastKick = 0
  private lastSnare = 0

  start(context: AudioContext, source: AudioNode) {
    // Loudness bands normalize roughly into 0..~10; divide by band count later.
    this.analyzer = Meyda.createMeydaAnalyzer({
      audioContext: context,
      source: source as never,
      bufferSize: BUFFER_SIZE,
      numberOfBarkBands: BAND_COUNT,
      featureExtractors: ['rms', 'loudness'],
      callback: (features: Partial<MeydaFeaturesObject>) =>
        this.handle(features, context.currentTime),
    })
    this.analyzer.start()
  }

  stop() {
    this.analyzer?.stop()
    this.analyzer = null
  }

  private handle(features: Partial<MeydaFeaturesObject>, now: number) {
    const loudness = features.loudness
    if (!loudness) return
    const bands = loudness.specific

    const bassRaw = sumBand(bands, BASS_BANDS)
    const midRaw = sumBand(bands, MID_BANDS)
    const trebleRaw = sumBand(bands, TREBLE_BANDS)

    // Scale roughly into 0..1. Bark band values vary per track; the mixing
    // console later (reactive gain) decides how hard to push these.
    const bass = Math.min(1, bassRaw / 6)
    const mid = Math.min(1, midRaw / 4)
    const treble = Math.min(1, trebleRaw / 3)

    audioState.bass = lerp(audioState.bass, bass, BAND_SMOOTH)
    audioState.mid = lerp(audioState.mid, mid, BAND_SMOOTH)
    audioState.treble = lerp(audioState.treble, treble, BAND_SMOOTH)
    audioState.rms = features.rms ?? audioState.rms

    // Running averages for adaptive onset detection.
    this.bassAvg = lerp(this.bassAvg, bass, AVG_SMOOTH)
    this.trebleAvg = lerp(this.trebleAvg, treble, AVG_SMOOTH)

    if (
      bass > this.bassAvg * KICK_THRESHOLD &&
      bass > 0.12 &&
      now - this.lastKick > MIN_ONSET_INTERVAL_SEC
    ) {
      audioState.kick = 1
      this.lastKick = now
    }

    if (
      treble > this.trebleAvg * SNARE_THRESHOLD &&
      treble > 0.08 &&
      now - this.lastSnare > MIN_ONSET_INTERVAL_SEC
    ) {
      audioState.snare = 1
      this.lastSnare = now
    }
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
