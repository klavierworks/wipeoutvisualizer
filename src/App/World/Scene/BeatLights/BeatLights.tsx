import type { BufferAttribute, Group, MeshBasicMaterial } from 'three'

import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'

import type { BeatLight } from '../../../../constructor/scene'

import { audioState } from '../../../../audio'
import { BEAT_LIGHT_INTENSITY } from '../../../../constants'

type BeatLightsProps = {
  lights: BeatLight[]
}

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

const setOpacity = (materials: MeshBasicMaterial[], opacity: number): void => {
  for (const material of materials) {
    material.opacity = opacity
  }
}

const BeatLights = ({ lights }: BeatLightsProps) => {
  useFrame(() => {
    const intensity = audioState.beatPhase * BEAT_LIGHT_INTENSITY
    const opacity = audioState.beatPhase

    for (const light of lights) {
      if (light.kind === 'opacity') {
        setOpacity(light.materials, opacity)
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

  return (
    <>
      {lights.map((light, index) => (
        <primitive key={index} object={light.group} scale={1} />
      ))}
    </>
  )
}

export default BeatLights
