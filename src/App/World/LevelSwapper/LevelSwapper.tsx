import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

import { audioState, type SectionMarker } from '../../../audio'

type LevelSwapperProps = {
  onSection: (index: number, strength: number) => void
  sections: SectionMarker[]
}

const LevelSwapper = ({ onSection, sections }: LevelSwapperProps) => {
  const last = useRef(audioState.sectionIndex)

  useFrame(() => {
    const index = audioState.sectionIndex

    if (index !== last.current) {
      last.current = index
      onSection(index, sections[index]?.strength ?? 0)
    }
  })

  return null
}

export default LevelSwapper
