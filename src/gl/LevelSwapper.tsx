import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { audioState, type SectionMarker } from '../audio'

type Props = {
  sections: SectionMarker[]
  onSection: (index: number, strength: number) => void
}

// Watches audioState.sectionIndex from inside the Canvas and fires onSection
// once per boundary crossing. The caller decides what the swap means (advance
// level, trigger a camera FX, reshuffle a palette).
export const LevelSwapper = ({ sections, onSection }: Props) => {
  const last = useRef(audioState.sectionIndex)

  useFrame(() => {
    const idx = audioState.sectionIndex
    if (idx !== last.current) {
      last.current = idx
      onSection(idx, sections[idx]?.strength ?? 0)
    }
  })

  return null
}
