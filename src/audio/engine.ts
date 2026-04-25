export type LoadedAudio = {
  buffer: AudioBuffer
  context: AudioContext
  element: HTMLAudioElement
  source: MediaElementAudioSourceNode
}

const fetchAudioBytes = async (src: string): Promise<ArrayBuffer> => {
  const response = await fetch(src)

  if (!response.ok) {
    throw new Error(`Failed to load ${src}: ${response.status}`)
  }

  return response.arrayBuffer()
}

const createAudioElement = (bytes: ArrayBuffer): HTMLAudioElement => {
  const blob = new Blob([bytes], { type: 'audio/mpeg' })
  const element = new Audio(URL.createObjectURL(blob))

  element.crossOrigin = 'anonymous'
  element.preload = 'auto'
  element.loop = true

  return element
}

type AudioGraph = { context: AudioContext; source: MediaElementAudioSourceNode }

const createAudioGraph = (element: HTMLAudioElement): AudioGraph => {
  const context = new AudioContext()
  const source = context.createMediaElementSource(element)

  source.connect(context.destination)

  return { context, source }
}

const createLoadedAudio = async (src: string): Promise<LoadedAudio> => {
  const bytes = await fetchAudioBytes(src)
  const element = createAudioElement(bytes)
  const { context, source } = createAudioGraph(element)
  const buffer = await context.decodeAudioData(bytes.slice(0))

  return { buffer, context, element, source }
}

export class AudioEngine {
  get currentTime() {
    return this.loaded?.element.currentTime ?? 0
  }

  get isPlaying() {
    const element = this.loaded?.element

    if (!element || element.paused || element.ended) {
      return false
    }

    return element.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
  }

  private loaded: LoadedAudio | null = null

  ensureRunning() {
    const context = this.loaded?.context

    if (context && context.state === 'suspended') {
      void context.resume()
    }
  }

  async load(src: string): Promise<LoadedAudio> {
    if (this.loaded) {
      return this.loaded
    }

    this.loaded = await createLoadedAudio(src)

    return this.loaded
  }

  pause() {
    this.loaded?.element.pause()
  }

  async play() {
    if (!this.loaded) {
      throw new Error('AudioEngine.play() called before load()')
    }

    if (this.loaded.context.state === 'suspended') {
      await this.loaded.context.resume()
    }

    await this.loaded.element.play()
  }
}
