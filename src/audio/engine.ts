// Owns the AudioContext, the <audio> element used for playback, and the
// MediaElementSource node that downstream consumers (feature extractor) tap.
// Also holds the decoded AudioBuffer used for one-off offline BPM analysis.

export type LoadedAudio = {
  context: AudioContext
  element: HTMLAudioElement
  source: MediaElementAudioSourceNode
  buffer: AudioBuffer
}

export class AudioEngine {
  private loaded: LoadedAudio | null = null

  async load(src: string): Promise<LoadedAudio> {
    if (this.loaded) return this.loaded

    const response = await fetch(src)
    if (!response.ok) throw new Error(`Failed to load ${src}: ${response.status}`)
    const bytes = await response.arrayBuffer()

    const blob = new Blob([bytes], { type: 'audio/mpeg' })
    const element = new Audio(URL.createObjectURL(blob))
    element.crossOrigin = 'anonymous'
    element.preload = 'auto'
    element.loop = true

    const context = new AudioContext()
    const source = context.createMediaElementSource(element)
    source.connect(context.destination)

    // decodeAudioData detaches the buffer, so slice a copy for it.
    const buffer = await context.decodeAudioData(bytes.slice(0))

    this.loaded = { context, element, source, buffer }
    return this.loaded
  }

  async play() {
    if (!this.loaded) throw new Error('AudioEngine.play() called before load()')
    if (this.loaded.context.state === 'suspended') {
      await this.loaded.context.resume()
    }
    await this.loaded.element.play()
  }

  pause() {
    this.loaded?.element.pause()
  }

  get currentTime() {
    return this.loaded?.element.currentTime ?? 0
  }

  // True if the element is actually producing audio this instant. HAVE_FUTURE_DATA
  // filters out stall/buffer states where el.paused is technically false but the
  // media pipeline has no data, which otherwise masquerades as "playing" while
  // Meyda receives silence.
  get playing() {
    const el = this.loaded?.element
    if (!el || el.paused || el.ended) return false
    return el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
  }

  // Chrome can suspend the AudioContext on tab blur or after long idle. Calling
  // this on each frame is cheap when already running, and fixes the case where
  // playback silently loses its audio graph.
  ensureRunning() {
    const ctx = this.loaded?.context
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }
}
