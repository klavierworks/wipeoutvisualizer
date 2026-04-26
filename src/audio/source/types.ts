export type FileSource = {
  audioContext: AudioContext
  buffer: AudioBuffer
  dispose: () => void
  ensureRunning: () => Promise<void>
  getCurrentTime: () => number
  getDuration: () => number
  isPlaying: () => boolean
  kind: 'file'
  node: AudioNode
  play: () => Promise<void>
}

export type MicSource = {
  audioContext: AudioContext
  dispose: () => void
  ensureRunning: () => Promise<void>
  getCurrentTime: () => number
  getDuration: () => null
  isPlaying: () => boolean
  kind: 'mic'
  node: MediaStreamAudioSourceNode
  stream: MediaStream
}

export type Source = FileSource | MicSource
