import type { AnalyzeResult } from '../../../audio/analyze'

import { buildSections } from '../../../audio/clock'
import { AudioEngine } from '../../../audio/engine'
import { FeatureExtractor } from '../../../audio/features'
import { audioState } from '../../../audio/state'

export const startPlayback = async (
  engine: AudioEngine,
  src: string,
  analysis: AnalyzeResult,
  duration: number,
): Promise<FeatureExtractor> => {
  await engine.play()

  const loaded = await engine.load(src)
  const extractor = new FeatureExtractor()

  extractor.start(loaded.context, loaded.source)

  audioState.isReady = true
  audioState.bpm = analysis.bpm
  audioState.duration = duration
  audioState.sections = buildSections(analysis.sections, analysis.tempoSegments, duration)

  return extractor
}
