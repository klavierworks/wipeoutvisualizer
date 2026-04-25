import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import type { AnalyzeResult } from '../../../audio/analyze'

import { AudioEngine } from '../../../audio/engine'
import { FeatureExtractor } from '../../../audio/features'
import styles from './AudioProvider.module.css'
import { loadAndAnalyze } from './loadAndAnalyze'
import { startPlayback } from './startPlayback'

type AudioProviderProps = {
  children: (audio: ProvidedAudio) => ReactNode
  src: string
}

type LoadState =
  | { analysis: AnalyzeResult; duration: number; kind: 'playing' }
  | { analysis: AnalyzeResult; duration: number; kind: 'ready' }
  | { kind: 'error'; message: string }
  | { kind: 'loading' }

type ProvidedAudio = { analysis: AnalyzeResult; engine: AudioEngine }

const summarizeAnalysis = (analysis: AnalyzeResult): string => {
  const segments = analysis.tempoSegments.length
  const sections = analysis.sections.length
  const segmentLabel = segments === 1 ? 'segment' : 'segments'
  const sectionLabel = sections === 1 ? 'section' : 'sections'

  return `${analysis.bpm.toFixed(1)} BPM · ${segments} tempo ${segmentLabel} · ${sections} ${sectionLabel}`
}

const AudioProvider = ({ children, src }: AudioProviderProps) => {
  const engineRef = useRef<AudioEngine | null>(null)
  const featuresRef = useRef<FeatureExtractor | null>(null)
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    let isCancelled = false
    const engine = new AudioEngine()

    engineRef.current = engine

    loadAndAnalyze(engine, src)
      .then(({ analysis, duration }) => {
        if (isCancelled) {
          return
        }

        setState({ analysis, duration, kind: 'ready' })
      })
      .catch((error) => {
        if (!isCancelled) {
          setState({ kind: 'error', message: String(error) })
        }
      })

    return () => {
      isCancelled = true
      featuresRef.current?.stop()
      engine.pause()
    }
  }, [src])

  const handlePlay = useCallback(async () => {
    const engine = engineRef.current

    if (!engine || state.kind !== 'ready') {
      return
    }

    featuresRef.current = await startPlayback(engine, src, state.analysis, state.duration)

    setState({ analysis: state.analysis, duration: state.duration, kind: 'playing' })
  }, [state, src])

  if (state.kind === 'playing') {
    return <>{children({ analysis: state.analysis, engine: engineRef.current! })}</>
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <p className={styles.title}>Audio Visualizer</p>
        {state.kind === 'loading' && <p className={styles.meta}>Loading track & analyzing…</p>}
        {state.kind === 'ready' && (
          <>
            <p className={styles.meta}>{summarizeAnalysis(state.analysis)}</p>
            <button className={styles.button} onClick={handlePlay}>
              Start
            </button>
          </>
        )}
        {state.kind === 'error' && <p className={styles.meta}>Error: {state.message}</p>}
      </div>
    </div>
  )
}

export default AudioProvider
