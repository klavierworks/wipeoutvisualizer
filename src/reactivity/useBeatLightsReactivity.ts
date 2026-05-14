import type { BufferAttribute, Group } from 'three'

import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'

import type { BeatLight } from '../constructor/scene'

import { audioState } from '../audio'
import { BEAT_LIGHT_DOWNBEAT_BONUS, BEAT_LIGHT_INTENSITY, TWO_PI } from '../constants'
import { getIsDownbeat } from './derive/calculatePhrasePhase'

const findMesh = (group: Group): Mesh | undefined =>
  group.children.find((child): child is Mesh => child instanceof Mesh)

const paintMesh = (mesh: Mesh, r: number, g: number, b: number): void => {
  const colorAttribute = mesh.geometry.getAttribute('color') as BufferAttribute | undefined

  if (!colorAttribute) {
    return
  }

  const colors = colorAttribute.array as Float32Array

  for (let i = 0; i < colors.length; i += 3) {
    colors[i] = r
    colors[i + 1] = g
    colors[i + 2] = b
  }

  colorAttribute.needsUpdate = true
}

const useBeatLightsReactivity = (lights: BeatLight[]) => {
  useFrame(() => {
    const downbeatBonus = getIsDownbeat() ? BEAT_LIGHT_DOWNBEAT_BONUS : 0
    // Cosine envelope peaks at beatPhase 0 and 1 (i.e. on every beat) and
    // troughs at 0.5. Using beatPhase directly (a sawtooth) inverted the
    // expected behaviour: lights ramped UP between beats and snapped dark
    // right on the beat.
    const pulse = 0.5 * (1 + Math.cos(TWO_PI * audioState.beatPhase))
    const intensity = pulse * BEAT_LIGHT_INTENSITY * (1 + downbeatBonus)

    for (const light of lights) {
      if (light.kind === 'opacity') {
        continue
      }
      const mesh = findMesh(light.group)

      if (!mesh) {
        continue
      }

      if (light.kind === 'red') {
        paintMesh(mesh, intensity, 0, 0)
      } else {
        paintMesh(mesh, intensity, intensity, intensity)
      }
    }
  })
}

export default useBeatLightsReactivity
