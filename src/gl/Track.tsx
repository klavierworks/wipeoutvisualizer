import { useFrame } from '@react-three/fiber'
import { MutableRefObject, useMemo, useRef } from 'react'
import type { BufferAttribute, Mesh } from 'three'
import { audioState } from '../audio'
import type { BuiltTrack } from '../constructor/track'

type Props = {
  track: BuiltTrack
  racerTsRef?: MutableRefObject<Float32Array>
}

// Hot colour both boost flashes and weapon beat-pulses lerp toward.
const HOT_COLOR: [number, number, number] = [2.5, 1.2, 0.4]

// Weapon-tile pulse: jumps to 1 on every new beat, decays exponentially.
const WEAPON_FALLOFF = 3.5

// Boost pass-over flash: set to 1 the frame a ship enters a boost section,
// decays thereafter. Higher falloff = tighter, more ship-localised flash.
const BOOST_FALLOFF = 4

export const Track = ({ track, racerTsRef, ...props }: Props) => {
  const meshRef = useRef<Mesh>(null)

  // Weapon pulse shares a single scalar across all weapon vertices (they
  // all react to the beat together).
  const lastBeat = useRef(-1)
  const weaponPulse = useRef(0)

  // Snapshot weapon vertices' original per-face colours so the pulse lerps
  // toward HOT_COLOR without overwriting the baked-in tile palette.
  const weaponBase = useMemo(() => {
    if (track.weaponIndices.length === 0) return new Float32Array(0)
    const attr = track.mesh.geometry.getAttribute('color') as BufferAttribute
    const source = attr.array as Float32Array
    const out = new Float32Array(track.weaponIndices.length * 3)
    for (let i = 0; i < track.weaponIndices.length; i++) {
      const vi = track.weaponIndices[i] * 3
      out[i * 3] = source[vi]
      out[i * 3 + 1] = source[vi + 1]
      out[i * 3 + 2] = source[vi + 2]
    }
    return out
  }, [track])

  // One pulse scalar per boost section, retriggered as each ship crosses in.
  const boostPulses = useRef<Float32Array>(new Float32Array(track.boostSections.length))
  // Per-ship memory of the last boost-section index they were on (or -1).
  // Sized lazily once racerTsRef.current is known.
  const lastBoostByShip = useRef<Int32Array>(new Int32Array(0))

  useFrame((_, dt) => {
    const mesh = meshRef.current
    if (!mesh) return

    const attr = mesh.geometry.getAttribute('color') as BufferAttribute
    const colors = attr.array as Float32Array
    let dirty = false

    // --- Weapon tiles: beat-driven pulse -----------------------------------
    if (track.weaponIndices.length > 0) {
      const beatIndex = Math.floor(audioState.beat)
      if (beatIndex !== lastBeat.current && audioState.playing) {
        weaponPulse.current = 1
        lastBeat.current = beatIndex
      }
      weaponPulse.current = Math.max(0, weaponPulse.current - dt * WEAPON_FALLOFF)

      const lift = Math.min(1, weaponPulse.current + audioState.bass * 0.3)
      const indices = track.weaponIndices
      for (let i = 0; i < indices.length; i++) {
        const vi = indices[i] * 3
        const br = weaponBase[i * 3]
        const bg = weaponBase[i * 3 + 1]
        const bb = weaponBase[i * 3 + 2]
        colors[vi] = br + (HOT_COLOR[0] - br) * lift
        colors[vi + 1] = bg + (HOT_COLOR[1] - bg) * lift
        colors[vi + 2] = bb + (HOT_COLOR[2] - bb) * lift
      }
      dirty = true
    }

    // --- Boost tiles: ship pass-over flash ---------------------------------
    const boostSections = track.boostSections
    if (boostSections.length > 0) {
      const racerTs = racerTsRef?.current
      if (racerTs) {
        if (lastBoostByShip.current.length !== racerTs.length) {
          lastBoostByShip.current = new Int32Array(racerTs.length).fill(-1)
        }
        const n = track.numSections
        for (let s = 0; s < racerTs.length; s++) {
          const t = racerTs[s]
          // Ships don't set t until their first frame; 0 is a valid racer
          // position, but an uninitialised slot would spuriously flash
          // section 0. The leader always writes first, so skip slots that
          // still sit at exactly 0 after the initial frame.
          const idx = Math.floor((((t % 1) + 1) % 1) * n)
          const boostIdx = track.boostSectionAt[idx]
          if (boostIdx >= 0 && boostIdx !== lastBoostByShip.current[s]) {
            boostPulses.current[boostIdx] = 1
          }
          lastBoostByShip.current[s] = boostIdx
        }
      }

      const base = track.boostBaseColor
      const pulses = boostPulses.current
      const decay = dt * BOOST_FALLOFF
      for (let b = 0; b < boostSections.length; b++) {
        pulses[b] = Math.max(0, pulses[b] - decay)
        const lift = pulses[b]
        const r = base[0] + (HOT_COLOR[0] - base[0]) * lift
        const g = base[1] + (HOT_COLOR[1] - base[1]) * lift
        const bbl = base[2] + (HOT_COLOR[2] - base[2]) * lift
        const indices = boostSections[b].indices
        for (let i = 0; i < indices.length; i++) {
          const vi = indices[i] * 3
          colors[vi] = r
          colors[vi + 1] = g
          colors[vi + 2] = bbl
        }
      }
      dirty = true
    }

    if (dirty) attr.needsUpdate = true
  })

  return <primitive object={track.mesh} ref={meshRef} {...props} />
}
