import { Box3, BufferAttribute, type Color, Group, Matrix4, Mesh, Vector3 } from 'three'

import type { TrackSpline } from '../../../constructor/trackSpline'
import type { CountdownState } from '../../../reactivity/derive/calculateCountdownState'

import {
  CORRECTION,
  COUNTDOWN_GREEN,
  COUNTDOWN_RED,
  COUNTDOWN_YELLOW,
  START_GANTRY_DISTANCE,
  START_GANTRY_HEIGHT,
  START_GANTRY_ROTATION_X_BY_TRACK,
} from '../../../constants'
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
const _box = new Box3()
const _size = new Vector3()

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

// The PRM is supposed to load with its long arch axis on local +X, height on
// +Y, depth on +Z, but the source asset isn't reliable about which axis is
// which. Rotate the cloned mesh once so the longest dimension always lands
// on local +X, before we hand it to poseAtStartLine.
const normalizeArchAxes = (gantry: Group): void => {
  _box.setFromObject(gantry)
  _box.getSize(_size)

  if (_size.y > _size.x && _size.y >= _size.z) {
    gantry.rotateZ(-Math.PI / 2)
  } else if (_size.z > _size.x && _size.z > _size.y) {
    gantry.rotateY(Math.PI / 2)
  }
}

// Build a basis with our world (basisX, trackUp, tangent) at the start line
// and align the normalized mesh-local axes to it, then push the gantry forward
// along the tangent. CORRECTION matches the ship convention so the gantry's
// front faces the same direction as the player ship.
const poseAtStartLine = (gantry: Group, spline: TrackSpline): void => {
  spline.curve.getPointAt(spline.startLineT, _position)
  spline.curve.getTangentAt(spline.startLineT, _tangent).normalize()
  sampleTrackUp(spline, spline.startLineT, _trackUp)
  _basisX.crossVectors(_trackUp, _tangent).normalize()
  _matrix.makeBasis(_basisX, _trackUp, _tangent)

  gantry.quaternion.setFromRotationMatrix(_matrix).multiply(CORRECTION)
  gantry.position.copy(_position)
    .addScaledVector(_trackUp, START_GANTRY_HEIGHT)
    .addScaledVector(_tangent, START_GANTRY_DISTANCE)
}

export const buildStartGantry = (
  template: Group,
  spline: TrackSpline,
  trackPath: string,
): BuiltStartGantry => {
  const inner = template.clone(true)
  inner.position.set(0, 0, 0)
  inner.quaternion.identity()
  const colorAttrs = cloneGantryMeshes(inner)
  normalizeArchAxes(inner)
  inner.rotateY(START_GANTRY_ROTATION_X_BY_TRACK[trackPath] ?? 0)
  const gantry = new Group()
  gantry.add(inner)
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
