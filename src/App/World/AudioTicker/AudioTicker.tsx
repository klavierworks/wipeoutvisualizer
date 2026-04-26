import { useFrame } from '@react-three/fiber'
import { useEffect } from 'react'

import type { Pipeline } from '../../../audio/pipeline'

import { audioState } from '../../../audio/state'

type AudioTickerProps = { pipeline: Pipeline }

const AudioTicker = ({ pipeline }: AudioTickerProps) => {
  useEffect(() => {
    window.audioState = audioState
  }, [])

  useFrame((_, dt) => {
    pipeline.tickFrame(dt)
  })

  return null
}

export default AudioTicker
