import type { MicSource } from './types'

const MIC_CONSTRAINTS: MediaTrackConstraints = {
  autoGainControl: false,
  echoCancellation: false,
  noiseSuppression: false,
}

const ensureContextRunning = async (context: AudioContext): Promise<void> => {
  if (context.state === 'suspended') {
    await context.resume()
  }
}

export const createMicSource = async (): Promise<MicSource> => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS, video: false })
  const audioContext = new AudioContext()
  const node = audioContext.createMediaStreamSource(stream)

  return {
    audioContext,
    dispose: () => {
      for (const track of stream.getTracks()) {
        track.stop()
      }
      node.disconnect()
      void audioContext.close()
    },
    ensureRunning: () => ensureContextRunning(audioContext),
    getCurrentTime: () => audioContext.currentTime,
    getDuration: () => null,
    isPlaying: () => stream.active && audioContext.state === 'running',
    kind: 'mic',
    node,
    stream,
  }
}
