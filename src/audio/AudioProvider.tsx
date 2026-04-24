import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { AudioEngine } from './engine'
import { FeatureExtractor } from './features'
import { analyzeTrack, type AnalyzeResult } from './analyze'
import { buildSections } from './clock'
import { audioState } from './state'
import styles from './AudioProvider.module.css'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; analysis: AnalyzeResult; duration: number }
  | { kind: 'playing'; analysis: AnalyzeResult; duration: number }
  | { kind: 'error'; message: string }

type ProvidedAudio = { engine: AudioEngine; analysis: AnalyzeResult }

type Props = {
  src: string
  children: (audio: ProvidedAudio) => ReactNode
}

// Orchestrates:
//   1. mp3 fetch + decode
//   2. offline analysis in a worker (bpm, tempo segments, section boundaries)
//   3. Meyda analyzer wire-up
//   4. "Click to start" gesture for the browser's AudioContext policy
//
// Children receive the engine + analysis once the track is ready AND the user
// has clicked play — so downstream Canvas code can assume audio is live.
export const AudioProvider = ({ src, children }: Props) => {
  const engineRef = useRef<AudioEngine | null>(null)
  const featuresRef = useRef<FeatureExtractor | null>(null)
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    const engine = new AudioEngine()
    engineRef.current = engine

    ;(async () => {
      const loaded = await engine.load(src)
      if (cancelled) return
      const duration = loaded.buffer.duration
      const analysis = await analyzeTrack(loaded.buffer)
      if (cancelled) return
      setState({ kind: 'ready', analysis, duration })
    })().catch((error) => {
      if (!cancelled) setState({ kind: 'error', message: String(error) })
    })

    return () => {
      cancelled = true
      featuresRef.current?.stop()
      engine.pause()
    }
  }, [src])

  const handlePlay = useCallback(async () => {
    const engine = engineRef.current
    if (!engine || state.kind !== 'ready') return
    await engine.play()
    const loaded = await engine.load(src)
    const extractor = new FeatureExtractor()
    extractor.start(loaded.context, loaded.source)
    featuresRef.current = extractor
    audioState.ready = true
    audioState.bpm = state.analysis.bpm
    audioState.duration = state.duration
    audioState.sections = buildSections(
      state.analysis.sections,
      state.analysis.tempoSegments,
      state.duration,
    )
    setState({ kind: 'playing', analysis: state.analysis, duration: state.duration })
  }, [state])

  if (state.kind === 'playing') {
    return <>{children({ engine: engineRef.current!, analysis: state.analysis })}</>
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <p className={styles.title}>Audio Visualizer</p>
        {state.kind === 'loading' && <p className={styles.meta}>Loading track & analyzing…</p>}
        {state.kind === 'ready' && (
          <>
            <p className={styles.meta}>
              {state.analysis.bpm.toFixed(1)} BPM · {state.analysis.tempoSegments.length} tempo
              {state.analysis.tempoSegments.length === 1 ? ' segment' : ' segments'} ·{' '}
              {state.analysis.sections.length} section
              {state.analysis.sections.length === 1 ? '' : 's'}
            </p>
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
