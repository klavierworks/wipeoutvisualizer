import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'

import type { AnalyzeResult } from '../../../audio/analyze'
import type { TickHint } from '../../../audio/clock'
import type { AudioEngine } from '../../../audio/engine'

import { buildTempoTable, tickClock, tickSection } from '../../../audio/clock'
import { PULSE_DECAY } from '../../../audio/constants'
import { audioState } from '../../../audio/state'

type AudioTickerProps = { analysis: AnalyzeResult; engine: AudioEngine }

const AudioTicker = ({ analysis, engine }: AudioTickerProps) => {
  const table = useMemo(() => buildTempoTable(analysis.tempoSegments, analysis.offset), [analysis])
  const hintRef = useRef<TickHint>({ section: 0, tempoSegment: 0 })

  useEffect(() => {
    window.audioState = audioState
  }, [])

  useFrame((_, dt) => {
    engine.ensureRunning()
    audioState.kick = Math.max(0, audioState.kick - dt * PULSE_DECAY)
    audioState.snare = Math.max(0, audioState.snare - dt * PULSE_DECAY)
    audioState.isPlaying = engine.isPlaying

    const afterClock = tickClock(engine.currentTime, table, hintRef.current)

    hintRef.current = tickSection(engine.currentTime, analysis.sections, afterClock)
  })

  return null
}

export default AudioTicker
