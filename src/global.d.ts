import type { AudioState } from './audio/state'

declare global {
  interface Window {
    audioState: AudioState
    debug: string
    plumeScale: number
    setMesh: (key: null | string) => void
  }
}

export {}
