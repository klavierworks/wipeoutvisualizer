import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { buildTempoTable, tickClock, tickSection } from './clock'
import { audioState } from './state'
import type { AudioEngine } from './engine'
import type { AnalyzeResult } from './analyze'

type Props = { engine: AudioEngine; analysis: AnalyzeResult }

const PULSE_DECAY = 5 // higher = snappier decay

// Runs inside <Canvas>. Each frame:
//   - resumes the AudioContext if Chrome suspended it
//   - advances beat/bar counters from the element's currentTime
//   - advances the structural-section index
//   - decays kick/snare pulses toward zero
export const AudioTicker = ({ engine, analysis }: Props) => {
  const table = useMemo(
    () => buildTempoTable(analysis.tempoSegments, analysis.offset),
    [analysis],
  )
  // Cursor shared between clock + section lookups so each frame scans from
  // where the previous one landed (O(1) amortized).
  const hint = useRef({ tempoSeg: 0, section: 0 })

  useFrame((_, dt) => {
    engine.ensureRunning()
    audioState.kick = Math.max(0, audioState.kick - dt * PULSE_DECAY)
    audioState.snare = Math.max(0, audioState.snare - dt * PULSE_DECAY)
    audioState.playing = engine.playing
    tickClock(engine.currentTime, table, hint.current)
    tickSection(engine.currentTime, analysis.sections, hint.current)
    window.audioState = audioState
  })
  return null
}
