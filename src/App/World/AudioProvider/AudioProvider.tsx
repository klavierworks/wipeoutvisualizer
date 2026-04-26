import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import type { Pipeline } from '../../../audio/pipeline'

import { wirePipeline } from '../../../audio/pipeline'
import { createFileSource } from '../../../audio/source/createFileSource'
import { createMicSource } from '../../../audio/source/createMicSource'
import styles from './AudioProvider.module.css'
import SourcePicker from './SourcePicker/SourcePicker'

type AudioProviderProps = {
  children: (audio: ProvidedAudio) => ReactNode
}

type LoadState =
  | { kind: 'error'; message: string }
  | { kind: 'loading'; label: string }
  | { kind: 'pick' }
  | { kind: 'playing'; pipeline: Pipeline }
  | { kind: 'ready'; pipeline: Pipeline; summary: string }

type ProvidedAudio = { pipeline: Pipeline }

const summarizeFilePipeline = (pipeline: Pipeline): string => {
  const analysis = pipeline.offlineAnalysis

  if (!analysis) {
    return 'Live microphone input'
  }

  const sections = analysis.sections.length
  const sectionLabel = sections === 1 ? 'section' : 'sections'

  return `${sections} ${sectionLabel}`
}

const AudioProvider = ({ children }: AudioProviderProps) => {
  const pipelineRef = useRef<null | Pipeline>(null)
  const [state, setState] = useState<LoadState>({ kind: 'pick' })

  const handlePickFile = useCallback(async (file: File) => {
    setState({ kind: 'loading', label: 'Loading & analyzing…' })

    try {
      const source = await createFileSource(file)
      const pipeline = await wirePipeline(source)

      pipelineRef.current = pipeline
      setState({ kind: 'ready', pipeline, summary: summarizeFilePipeline(pipeline) })
    } catch (error) {
      setState({ kind: 'error', message: String(error) })
    }
  }, [])

  const handlePickMic = useCallback(async () => {
    setState({ kind: 'loading', label: 'Requesting microphone…' })

    try {
      const source = await createMicSource()
      const pipeline = await wirePipeline(source)

      pipelineRef.current = pipeline
      setState({ kind: 'ready', pipeline, summary: 'Live microphone input' })
    } catch (error) {
      setState({ kind: 'error', message: String(error) })
    }
  }, [])

  const handleStart = useCallback(async () => {
    if (state.kind !== 'ready') {
      return
    }

    await state.pipeline.start()
    setState({ kind: 'playing', pipeline: state.pipeline })
  }, [state])

  useEffect(
    () => () => {
      pipelineRef.current?.dispose()
      pipelineRef.current = null
    },
    [],
  )

  if (state.kind === 'playing') {
    return <>{children({ pipeline: state.pipeline })}</>
  }

  if (state.kind === 'pick') {
    return <SourcePicker onPickFile={handlePickFile} onPickMic={handlePickMic} />
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <p className={styles.title}>Audio Visualizer</p>
        {state.kind === 'loading' && <p className={styles.meta}>{state.label}</p>}
        {state.kind === 'ready' && (
          <>
            <p className={styles.meta}>{state.summary}</p>
            <button className={styles.button} onClick={handleStart}>
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
