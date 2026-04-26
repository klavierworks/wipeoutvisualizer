import type { FileSource } from './types'

import { decodeBytes, readFileBytes } from '../preanalysis/decode'

const createAudioElement = (bytes: ArrayBuffer, mimeType: string): HTMLAudioElement => {
  const blob = new Blob([bytes], { type: mimeType })
  const element = new Audio(URL.createObjectURL(blob))

  element.crossOrigin = 'anonymous'
  element.preload = 'auto'
  element.loop = true

  return element
}

const ensureContextRunning = (context: AudioContext): void => {
  if (context.state === 'suspended') {
    void context.resume()
  }
}

export const createFileSource = async (file: File): Promise<FileSource> => {
  const bytes = await readFileBytes(file)
  const element = createAudioElement(bytes, file.type || 'audio/mpeg')
  const audioContext = new AudioContext()
  const node = audioContext.createMediaElementSource(element)

  node.connect(audioContext.destination)

  const buffer = await decodeBytes(audioContext, bytes)

  return {
    audioContext,
    buffer,
    dispose: () => {
      element.pause()
      element.src = ''
      void audioContext.close()
    },
    element,
    ensureRunning: () => ensureContextRunning(audioContext),
    getCurrentTime: () => element.currentTime,
    getDuration: () => buffer.duration,
    isPlaying: () => {
      if (element.paused || element.ended) {
        return false
      }

      return element.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
    },
    kind: 'file',
    node,
    play: async () => {
      ensureContextRunning(audioContext)
      await element.play()
    },
  }
}
