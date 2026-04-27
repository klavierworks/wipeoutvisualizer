import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import type { Pipeline } from '../../../audio/pipeline'

import { wirePipeline } from '../../../audio/pipeline'
import { createFileSource } from '../../../audio/source/createFileSource'
import { createMicSource } from '../../../audio/source/createMicSource'
import SourcePicker from './SourcePicker/SourcePicker'

type AudioProviderProps = {
  children: (audio: ProvidedAudio) => ReactNode
}

type LoadState =
  | { kind: 'error'; message: string }
  | { kind: 'loading' }
  | { kind: 'pick' }
  | { kind: 'playing'; pipeline: Pipeline }

type ProvidedAudio = { pipeline: null | Pipeline }

const AudioProvider = ({ children }: AudioProviderProps) => {
  const pipelineRef = useRef<null | Pipeline>(null)
  const [state, setState] = useState<LoadState>({ kind: 'pick' })

  const handlePickFile = useCallback(async (file: File) => {
    setState({ kind: 'loading' })

    try {
      const source = await createFileSource(file)
      const pipeline = await wirePipeline(source)

      pipelineRef.current = pipeline
      await pipeline.start()
      setState({ kind: 'playing', pipeline })
    } catch (error) {
      setState({ kind: 'error', message: String(error) })
    }
  }, [])

  const handlePickMic = useCallback(async () => {
    setState({ kind: 'loading' })

    try {
      const source = await createMicSource()
      const pipeline = await wirePipeline(source)

      pipelineRef.current = pipeline
      await pipeline.start()
      setState({ kind: 'playing', pipeline })
    } catch (error) {
      setState({ kind: 'error', message: String(error) })
    }
  }, [])

  const handlePickAbout = useCallback(() => {
    window.open('https://github.com/klavierworks/wipeoutvisualizer', '_blank')
  }, [])

  useEffect(
    () => () => {
      pipelineRef.current?.dispose()
      pipelineRef.current = null
    },
    [],
  )

  const pipeline = state.kind === 'playing' ? state.pipeline : null

  return (
    <>
      {children({ pipeline })}
      {state.kind !== 'playing' && (
        <SourcePicker
          errorMessage={state.kind === 'error' ? state.message : null}
          isLoading={state.kind === 'loading'}
          onPickAbout={handlePickAbout}
          onPickFile={handlePickFile}
          onPickMic={handlePickMic}
        />
      )}
    </>
  )
}

export default AudioProvider
