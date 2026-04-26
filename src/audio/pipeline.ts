import type { AnalyzeResult } from './preanalysis/analyze.worker'
import type { Source } from './source/types'

import { createBeatTracker } from './aubio/createBeatTracker'
import {
  advanceOfflineSections,
  type ClockState,
  createClockState,
  recordBeat,
  tickClock,
  type TickHint,
  tickSectionTime,
} from './clock'
import { PULSE_DECAY } from './constants'
import { createSectionDetector, type SectionChange } from './estimators/createSectionDetector'
import { createExtractor } from './features/createExtractor'
import { createOnsetDetector } from './features/createOnsetDetector'
import { runOfflineAnalysis } from './preanalysis/runOfflineAnalysis'
import { buildSections, type SectionInfo } from './preanalysis/sections'
import { audioState } from './state'

export type Pipeline = {
  dispose: () => void
  offlineAnalysis: AnalyzeResult | null
  offlineSections: null | SectionInfo[]
  source: Source
  start: () => Promise<void>
  tickFrame: (dt: number) => void
}

const initializeFileState = (analysis: AnalyzeResult, duration: number): SectionInfo[] => {
  const sections = buildSections(analysis.sections, duration)
  const initial = sections[0]

  audioState.duration = duration
  audioState.sectionStart = initial?.start ?? 0
  audioState.sectionStrength = initial?.strength ?? 0
  audioState.sectionChangeCount = 0

  return sections
}

const initializeMicState = (): void => {
  audioState.duration = null
  audioState.sectionStart = 0
  audioState.sectionStrength = 0
  audioState.sectionChangeCount = 0
}

export const wirePipeline = async (source: Source): Promise<Pipeline> => {
  audioState.sourceKind = source.kind
  audioState.isReady = false
  audioState.bpm = 0
  audioState.bpmConfidence = 0

  const extractor = createExtractor(source.audioContext, source.node)
  const onsetDetector = createOnsetDetector({ useHardFloor: source.kind === 'file' })
  const beatTracker = await createBeatTracker(source.audioContext, source.node)
  const sectionDetector = createSectionDetector(source.audioContext.sampleRate, () => {
    const bpm = audioState.bpm

    return bpm > 0 ? (60 / bpm) * 4 : 8
  })

  const clockState: ClockState = createClockState()

  const unsubscribeOnsetDetector = extractor.onFrame(onsetDetector.handle)
  const unsubscribeSectionDetector = extractor.onFrame(sectionDetector.feedFrame)

  const unsubscribeBeat = beatTracker.onBeat(({ bpm, confidence }) => {
    recordBeat(clockState, source.getCurrentTime(), bpm, confidence)
  })

  const unsubscribeOnset = beatTracker.onOnset(() => {
    audioState.onset = 1
  })

  const handleSectionChange = (change: SectionChange): void => {
    if (source.kind !== 'mic') {
      return
    }

    audioState.sectionStart = change.time
    audioState.sectionStrength = change.strength
    audioState.sectionChangeCount += 1
  }

  const unsubscribeSectionChange = sectionDetector.onChange(handleSectionChange)

  let offlineAnalysis: AnalyzeResult | null = null
  let offlineSections: null | SectionInfo[] = null
  const hint: TickHint = { section: 0 }

  if (source.kind === 'file') {
    offlineAnalysis = await runOfflineAnalysis(source.buffer)
    offlineSections = initializeFileState(offlineAnalysis, source.buffer.duration)
  } else {
    initializeMicState()
  }

  return {
    dispose: () => {
      unsubscribeOnsetDetector()
      unsubscribeSectionDetector()
      unsubscribeSectionChange()
      unsubscribeBeat()
      unsubscribeOnset()
      extractor.stop()
      beatTracker.dispose()
      source.dispose()
    },
    offlineAnalysis,
    offlineSections,
    source,
    start: async () => {
      await source.ensureRunning()

      if (source.kind === 'file') {
        await source.play()
      } else {
        audioState.sectionStart = source.getCurrentTime()
      }

      extractor.start()
      beatTracker.start()
      audioState.isReady = true
    },
    tickFrame: (dt) => {
      void source.ensureRunning()

      const currentTime = source.getCurrentTime()

      audioState.kick = Math.max(0, audioState.kick - dt * PULSE_DECAY)
      audioState.snare = Math.max(0, audioState.snare - dt * PULSE_DECAY)
      audioState.onset = Math.max(0, audioState.onset - dt * PULSE_DECAY)
      audioState.isPlaying = source.isPlaying()

      tickClock(currentTime, clockState)

      if (offlineSections) {
        const after = advanceOfflineSections(currentTime, offlineSections, hint)

        hint.section = after.section
      }

      tickSectionTime(currentTime)
    },
  }
}
