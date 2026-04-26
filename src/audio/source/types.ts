export type FileSource = {
  audioContext: AudioContext
  buffer: AudioBuffer
  dispose: () => void
  element: HTMLAudioElement
  ensureRunning: () => void
  getCurrentTime: () => number
  getDuration: () => number
  isPlaying: () => boolean
  kind: 'file'
  node: MediaElementAudioSourceNode
  play: () => Promise<void>
}

export type MicSource = {
  audioContext: AudioContext
  dispose: () => void
  ensureRunning: () => void
  getCurrentTime: () => number
  getDuration: () => null
  isPlaying: () => boolean
  kind: 'mic'
  node: MediaStreamAudioSourceNode
  stream: MediaStream
}

export type Source = FileSource | MicSource
