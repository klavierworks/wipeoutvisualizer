import type { AnalyzeResult } from './analyze.worker'

export type { AnalyzeResult, SectionMarker } from './analyze.worker'

const mixdown = (buffer: AudioBuffer): Float32Array => {
  const length = buffer.length
  const channels = buffer.numberOfChannels
  const out = new Float32Array(length)

  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c)

    for (let i = 0; i < length; i++) {
      out[i] += data[i]
    }
  }

  if (channels > 1) {
    const scale = 1 / channels

    for (let i = 0; i < length; i++) {
      out[i] *= scale
    }
  }

  return out
}

export const runOfflineAnalysis = (buffer: AudioBuffer): Promise<AnalyzeResult> => {
  const mono = mixdown(buffer)

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./analyze.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<AnalyzeResult | { error: string }>) => {
      worker.terminate()

      if ('error' in event.data) {
        reject(new Error(event.data.error))
      } else {
        resolve(event.data)
      }
    }

    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message))
    }

    worker.postMessage({ pcm: mono, sampleRate: buffer.sampleRate }, [mono.buffer])
  })
}
