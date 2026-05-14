import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

import { audioState } from '../../../audio'

export type SectionEvent = {
  isReset: boolean
  strength: number
}

type LevelSwapperProps = {
  onSection: (event: SectionEvent) => void
}

const LevelSwapper = ({ onSection }: LevelSwapperProps) => {
  const lastChangeCount = useRef(audioState.sectionChangeCount)
  const lastResetCount = useRef(audioState.sectionResetCount)

  useFrame(() => {
    const change = audioState.sectionChangeCount
    const reset = audioState.sectionResetCount

    if (change === lastChangeCount.current && reset === lastResetCount.current) {
      return
    }

    const isReset = reset > lastResetCount.current

    lastChangeCount.current = change
    lastResetCount.current = reset

    onSection({ isReset, strength: audioState.sectionStrength })
  })

  return null
}

export default LevelSwapper
