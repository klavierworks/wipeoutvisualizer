import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

import { audioState } from '../../../audio'

type LevelSwapperProps = {
  onSection: (strength: number) => void
}

const LevelSwapper = ({ onSection }: LevelSwapperProps) => {
  const lastChangeCount = useRef(audioState.sectionChangeCount)

  useFrame(() => {
    const count = audioState.sectionChangeCount

    if (count !== lastChangeCount.current) {
      lastChangeCount.current = count
      onSection(audioState.sectionStrength)
    }
  })

  return null
}

export default LevelSwapper
