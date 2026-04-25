import { type AnalyzeResult, analyzeTrack } from '../../../audio/analyze'
import { AudioEngine } from '../../../audio/engine'

export type LoadedAndAnalyzed = {
  analysis: AnalyzeResult
  duration: number
}

export const loadAndAnalyze = async (engine: AudioEngine, src: string): Promise<LoadedAndAnalyzed> => {
  const loaded = await engine.load(src)
  const duration = loaded.buffer.duration
  const analysis = await analyzeTrack(loaded.buffer)

  return { analysis, duration }
}
