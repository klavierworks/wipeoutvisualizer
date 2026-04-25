import type { BufferAttribute } from 'three'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Mesh } from 'three'

import type { PolyTaggedSceneObject } from '../../../../constructor/scene'

import {
  START_BOOM_GREEN,
  START_BOOM_GREY,
  START_BOOM_ORANGE,
  START_BOOM_RED,
  START_BOOM_STAGE_COUNT,
  START_BOOM_STAGE_SECONDS,
} from '../../../../constants'

type Color3 = readonly [number, number, number]

type StartBoomsProps = {
  booms: PolyTaggedSceneObject[]
}

const stageColors = (stage: number): readonly [Color3, Color3, Color3] => [
  stage >= 1 ? START_BOOM_RED : START_BOOM_GREY,
  stage >= 2 ? START_BOOM_ORANGE : START_BOOM_GREY,
  stage >= 3 ? START_BOOM_GREEN : START_BOOM_GREY,
]

const findMesh = (group: PolyTaggedSceneObject['group']): Mesh | undefined =>
  group.children.find((child): child is Mesh => child instanceof Mesh)

const paintPolygon = (boom: PolyTaggedSceneObject, polygonIndex: number, color: Color3): boolean => {
  const indices = boom.polygonVertexIndices.get(polygonIndex)

  if (!indices) {
    return false
  }

  const mesh = findMesh(boom.group)

  if (!mesh) {
    return false
  }

  const colorAttribute = mesh.geometry.getAttribute('color') as BufferAttribute | undefined

  if (!colorAttribute) {
    return false
  }

  const colors = colorAttribute.array as Float32Array

  for (let i = 0; i < indices.length; i++) {
    const offset = indices[i] * 3
    colors[offset] = color[0]
    colors[offset + 1] = color[1]
    colors[offset + 2] = color[2]
  }

  colorAttribute.needsUpdate = true

  return true
}

const StartBooms = ({ booms }: StartBoomsProps) => {
  const lastStageRef = useRef<number>(-1)

  useFrame((state) => {
    const stage = Math.floor(state.clock.elapsedTime / START_BOOM_STAGE_SECONDS) % START_BOOM_STAGE_COUNT

    if (stage === lastStageRef.current) {
      return
    }

    lastStageRef.current = stage
    const colors = stageColors(stage)

    for (const boom of booms) {
      paintPolygon(boom, 0, colors[0])
      paintPolygon(boom, 1, colors[1])
      paintPolygon(boom, 2, colors[2])
    }
  })

  return (
    <>
      {booms.map((boom, index) => (
        <primitive key={index} object={boom.group} />
      ))}
    </>
  )
}

export default StartBooms
