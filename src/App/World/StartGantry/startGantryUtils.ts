import { BufferAttribute, type Color, Group, Matrix4, Mesh, Vector3 } from 'three'

import type { TrackSpline } from '../../../constructor/trackSpline'
import type { CountdownState } from '../../../reactivity/derive/calculateCountdownState'

import { COUNTDOWN_GREEN, COUNTDOWN_RED, COUNTDOWN_YELLOW, START_GANTRY_HEIGHT, START_GANTRY_DISTANCE } from '../../../constants'
import { sampleTrackUp } from '../Ships/splineSampling'

export type BuiltStartGantry = {
  colorAttrs: BufferAttribute[]
  gantry: Group
}

export const COUNTDOWN_TINTS: Record<CountdownState, Color> = {
  green: COUNTDOWN_GREEN,
  red: COUNTDOWN_RED,
  yellow: COUNTDOWN_YELLOW,
}

const _position = new Vector3()
const _tangent = new Vector3()
const _trackUp = new Vector3()
const _basisX = new Vector3()
const _matrix = new Matrix4()

const cloneGantryMeshes = (root: Group): BufferAttribute[] => {
  const colorAttrs: BufferAttribute[] = []
  root.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return
    }
    object.geometry = object.geometry.clone()
    const color = object.geometry.attributes.color
    if (color instanceof BufferAttribute) {
      colorAttrs.push(color)
    }
  })
  return colorAttrs
}

// The imported PRM uses local +X for its arch width, +Y for height, +Z for
// depth — so we build a basis with our world (basisX, trackUp, tangent) and
// align mesh-local axes to it.
const poseAtStartLine = (gantry: Group, spline: TrackSpline): void => {
  spline.curve.getPointAt(spline.startLineT, _position)
  spline.curve.getTangentAt(spline.startLineT, _tangent).normalize()
  sampleTrackUp(spline, spline.startLineT, _trackUp)
  _basisX.crossVectors(_trackUp, _tangent).normalize()
  _matrix.makeBasis(_basisX, _trackUp, _tangent)

  gantry.quaternion.setFromRotationMatrix(_matrix)
  gantry.position.copy(_position)
    .addScaledVector(_trackUp, START_GANTRY_HEIGHT)
    .addScaledVector(_tangent, START_GANTRY_DISTANCE)
}

export const buildStartGantry = (template: Group, spline: TrackSpline): BuiltStartGantry => {
  const gantry = template.clone(true)
  const colorAttrs = cloneGantryMeshes(gantry)
  poseAtStartLine(gantry, spline)
  return { colorAttrs, gantry }
}

export const applyCountdownTint = (colorAttrs: BufferAttribute[], color: Color): void => {
  for (const attribute of colorAttrs) {
    const array = attribute.array as Float32Array
    for (let i = 0; i < array.length; i += 3) {
      array[i] = color.r
      array[i + 1] = color.g
      array[i + 2] = color.b
    }
    attribute.needsUpdate = true
  }
}
