import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { DoubleSide, Group, Mesh, MeshBasicMaterial } from 'three'
import { audioState } from '../audio'

// Duration of the sky crossfade. Fade begins this many seconds before the
// upcoming section boundary and completes exactly at the boundary, so the
// sky smoothly morphs while scene/track/ships snap.
const SKY_FADE_SECONDS = 5

type Role = 'current' | 'next'

type Props = {
  object: Group
  role: Role
}

// Crossfade fraction in [0, 1]: 0 well before the section boundary, ramping
// to 1 exactly at the boundary. Read each frame from the shared audio state.
const computeFade = () => {
  const section = audioState.sections[audioState.sectionIndex]
  const timeToNext = section
    ? Math.max(0, section.duration - audioState.sectionTime)
    : Infinity
  return Math.max(0, Math.min(1, 1 - timeToNext / SKY_FADE_SECONDS))
}

export const Sky = ({ object, role }: Props) => {
  const materialsRef = useRef<MeshBasicMaterial[]>([])

  useEffect(() => {
    // Crossfade strategy: the *current* sky stays fully opaque the whole
    // time, and the *next* sky fades in on top. Three's built-in render
    // pass order (opaque first, transparent second) then does the right
    // thing — current always paints the backdrop, next blends in over it.
    // This avoids the ambiguous transparent-sort that made one sky win and
    // the other vanish when both were transparent at the same depth.
    const isNext = role === 'next'
    const mats: MeshBasicMaterial[] = []
    object.traverse((obj) => {
      if (!(obj instanceof Mesh)) return
      obj.frustumCulled = false
      const list = Array.isArray(obj.material) ? obj.material : [obj.material]
      for (const m of list) {
        const mat = m as MeshBasicMaterial
        mat.side = DoubleSide
        if (isNext) {
          mat.transparent = true
          // alphaTest discards fragments the moment opacity dips below the
          // threshold, which would make the fade look like a hard cut.
          mat.alphaTest = 0
          mat.opacity = computeFade()
          // Don't write to depth — the opaque current sky has already laid
          // down depth values, and we just want the next sky to blend on
          // top without disturbing them.
          mat.depthWrite = false
        } else {
          mat.transparent = false
          mat.opacity = 1
        }
        mats.push(mat)
      }
    })
    materialsRef.current = mats
  }, [object, role])

  useFrame(() => {
    if (role !== 'next') return
    const fade = computeFade()
    for (const m of materialsRef.current) m.opacity = fade
  })

  return <primitive object={object} />
}
