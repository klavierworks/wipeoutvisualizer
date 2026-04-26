import { AUBIO_BUFFER_SIZE, AUBIO_HOP_SIZE } from '../constants'
import { loadAubio } from './loadAubio'

export type BeatEvent = {
  bpm: number
  confidence: number
  time: number
}

export type BeatTracker = {
  dispose: () => void
  onBeat: (callback: BeatListener) => () => void
  onOnset: (callback: OnsetListener) => () => void
  start: () => void
}

export type OnsetEvent = {
  time: number
}

type BeatListener = (event: BeatEvent) => void

type OnsetListener = (event: OnsetEvent) => void

export const createBeatTracker = async (audioContext: AudioContext, source: AudioNode): Promise<BeatTracker> => {
  const aubio = await loadAubio()
  const sampleRate = audioContext.sampleRate
  const tempo = new aubio.Tempo(AUBIO_BUFFER_SIZE, AUBIO_HOP_SIZE, sampleRate)
  const onset = new (aubio.Onset as unknown as new (
    method: string,
    bufferSize: number,
    hopSize: number,
    sampleRate: number,
  ) => InstanceType<typeof aubio.Onset>)('default', AUBIO_BUFFER_SIZE, AUBIO_HOP_SIZE, sampleRate)

  const beatListeners = new Set<BeatListener>()
  const onsetListeners = new Set<OnsetListener>()

  const node = audioContext.createScriptProcessor(AUBIO_HOP_SIZE, 1, 1)

  node.onaudioprocess = (event) => {
    const samples = event.inputBuffer.getChannelData(0)
    const time = audioContext.currentTime

    if (tempo.do(samples) !== 0) {
      const beat: BeatEvent = { bpm: tempo.getBpm(), confidence: tempo.getConfidence(), time }

      for (const listener of beatListeners) {
        listener(beat)
      }
    }

    if (onset.do(samples) !== 0) {
      const event: OnsetEvent = { time }

      for (const listener of onsetListeners) {
        listener(event)
      }
    }
  }

  return {
    dispose: () => {
      node.onaudioprocess = null
      try {
        source.disconnect(node)
      } catch {
        // Already disconnected.
      }
      node.disconnect()
      beatListeners.clear()
      onsetListeners.clear()
    },
    onBeat: (callback) => {
      beatListeners.add(callback)

      return () => {
        beatListeners.delete(callback)
      }
    },
    onOnset: (callback) => {
      onsetListeners.add(callback)

      return () => {
        onsetListeners.delete(callback)
      }
    },
    start: () => {
      source.connect(node)
      node.connect(audioContext.destination)
    },
  }
}
