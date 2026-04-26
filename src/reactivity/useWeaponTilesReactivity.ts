import type { BufferAttribute, Mesh } from 'three'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'

import { audioState } from '../audio'
import {
  TWO_PI,
  WEAPON_BASS_LIFT_GAIN,
  WEAPON_CYCLE_BRIGHTNESS,
  WEAPON_CYCLE_LENGTH,
  WEAPON_FALLOFF,
  WEAPON_SNARE_THRESHOLD,
} from '../constants'

const captureBaseColors = (mesh: Mesh, indices: Uint32Array): Float32Array => {
  if (indices.length === 0) {
    return new Float32Array(0)
  }

  const colorAttribute = mesh.geometry.getAttribute('color') as BufferAttribute
  const source = colorAttribute.array as Float32Array
  const out = new Float32Array(indices.length * 3)

  for (let i = 0; i < indices.length; i++) {
    const vertexOffset = indices[i] * 3

    out[i * 3] = source[vertexOffset]
    out[i * 3 + 1] = source[vertexOffset + 1]
    out[i * 3 + 2] = source[vertexOffset + 2]
  }

  return out
}

const useWeaponTilesReactivity = (mesh: Mesh, indices: Uint32Array) => {
  const baseColors = useMemo(() => captureBaseColors(mesh, indices), [mesh, indices])
  const previousSnareAboveRef = useRef(false)
  const pulseRef = useRef(0)
  const cycleStepRef = useRef(0)

  useFrame((_, dt) => {
    if (indices.length === 0) {
      return
    }

    const isSnareAbove = audioState.snare > WEAPON_SNARE_THRESHOLD

    if (!previousSnareAboveRef.current && isSnareAbove && audioState.isPlaying) {
      pulseRef.current = 1
      cycleStepRef.current = (cycleStepRef.current + 1) % WEAPON_CYCLE_LENGTH
    }

    previousSnareAboveRef.current = isSnareAbove
    pulseRef.current = Math.max(0, pulseRef.current - dt * WEAPON_FALLOFF)

    const phase = (cycleStepRef.current / WEAPON_CYCLE_LENGTH) * TWO_PI
    const targetR = (Math.sin(phase) * 0.5 + 0.5) * WEAPON_CYCLE_BRIGHTNESS
    const targetG = (Math.cos(phase) * 0.5 + 0.5) * WEAPON_CYCLE_BRIGHTNESS
    const targetB = (Math.sin(-phase) * 0.5 + 0.5) * WEAPON_CYCLE_BRIGHTNESS

    const lift = Math.min(1, pulseRef.current + audioState.bass * WEAPON_BASS_LIFT_GAIN)

    const colorAttribute = mesh.geometry.getAttribute('color') as BufferAttribute
    const colors = colorAttribute.array as Float32Array

    for (let i = 0; i < indices.length; i++) {
      const vertexOffset = indices[i] * 3
      const baseR = baseColors[i * 3]
      const baseG = baseColors[i * 3 + 1]
      const baseB = baseColors[i * 3 + 2]

      colors[vertexOffset] = baseR + (targetR - baseR) * lift
      colors[vertexOffset + 1] = baseG + (targetG - baseG) * lift
      colors[vertexOffset + 2] = baseB + (targetB - baseB) * lift
    }

    colorAttribute.needsUpdate = true
  })
}

export default useWeaponTilesReactivity
