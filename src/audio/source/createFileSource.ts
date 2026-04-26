import type { FileSource } from './types'

import { decodeBytes, readFileBytes } from '../preanalysis/decode'

const ensureContextRunning = async (context: AudioContext): Promise<void> => {
  if (context.state === 'suspended') {
    await context.resume()
  }
}

export const createFileSource = async (file: File): Promise<FileSource> => {
  const bytes = await readFileBytes(file)
  const audioContext = new AudioContext()
  const buffer = await decodeBytes(audioContext, bytes)
  const tap = audioContext.createGain()

  tap.connect(audioContext.destination)

  let bufferSource: AudioBufferSourceNode | null = null
  let startedAt = 0
  let isStopped = false

  return {
    audioContext,
    buffer,
    dispose: () => {
      isStopped = true
      if (bufferSource) {
        try {
          bufferSource.stop()
        } catch {
          // already stopped
        }
        bufferSource.disconnect()
        bufferSource = null
      }
      void audioContext.close()
    },
    ensureRunning: () => ensureContextRunning(audioContext),
    getCurrentTime: () => {
      if (!bufferSource || isStopped) {
        return 0
      }

      return (audioContext.currentTime - startedAt) % buffer.duration
    },
    getDuration: () => buffer.duration,
    isPlaying: () => bufferSource !== null && !isStopped && audioContext.state === 'running',
    kind: 'file',
    node: tap,
    play: async () => {
      await ensureContextRunning(audioContext)
      bufferSource = audioContext.createBufferSource()
      bufferSource.buffer = buffer
      bufferSource.loop = true
      bufferSource.connect(tap)
      startedAt = audioContext.currentTime
      bufferSource.start()
    },
  }
}
