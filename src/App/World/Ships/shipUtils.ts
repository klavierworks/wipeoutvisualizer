import { Matrix4, Quaternion, Vector3 } from 'three'

import type { TrackSpline } from '../../../constructor/trackSpline'
import type { Ship } from './ship'

import { audioState } from '../../../audio'
import {
  AIR_GRAVITY,
  BAR_GAIN,
  BASE_SPEED,
  BASS_GAIN,
  BOOST_DURATION,
  BOOST_RAMP_DOWN_LERP,
  BOOST_RAMP_UP_LERP,
  BOOST_TILE_GAIN,
  COLLISION_OFFSET_DECAY,
  CORRECTION,
  KICK_GAIN,
  LAUNCH_ANGLE,
  LAUNCH_RAMP_LERP,
  LEADER_PACK_BIAS_GAIN,
  LEADER_PACK_BIAS_MAX,
  LOOK_AHEAD,
  MAX_ORIENT_PITCH,
  MAX_PITCH,
  MAX_ROLL,
  PITCH_LERP,
  ROLL_GAIN,
  ROLL_LERP,
  SEVERE_WALL_VELOCITY,
  SHIP_HOVER_HEIGHT,
  START_LANE_FADE_LERP,
  TWO_PI,
  WALL_STRESS_DECAY,
} from '../../../constants'
import { calculateBpmSpeedMultiplier } from '../../../reactivity/derive/calculateBpmSpeedMultiplier'
import { isRacing } from '../../../reactivity/derive/calculateCountdownState'
import { calculateShipSpeedMultiplier } from '../../../reactivity/derive/calculateShipSpeedMultiplier'
import { pickSplineIndex } from './ship'
import { clamp, sampleTrackUp, splineLane } from './splineSampling'

type PathSample = {
  basisX: Vector3
  curvePoint: Vector3
  desiredLane: number
  innerMax: number
  innerMin: number
  lane: number
  splineCenter: Vector3
  splinePosition: Vector3
  tangent: Vector3
  trackUp: Vector3
}

// Module-level scratch buffers. Reused across calls within a single tickShip
// pass; never escape to external callers.
const _curvePoint = new Vector3()
const _tangent = new Vector3()
const _trackUp = new Vector3()
const _basisX = new Vector3()
const _basisY = new Vector3()
const _basisZ = new Vector3()
const _splineCenter = new Vector3()
const _splinePosition = new Vector3()
const _splineVelocity = new Vector3()
const _orientationTangent = new Vector3()
const _aheadTangent = new Vector3()
const _matrix = new Matrix4()
const _quaternion = new Quaternion()
const _rollQuaternion = new Quaternion()
const _pitchQuaternion = new Quaternion()

const _sample: PathSample = {
  basisX: _basisX,
  curvePoint: _curvePoint,
  desiredLane: 0,
  innerMax: 0,
  innerMin: 0,
  lane: 0,
  splineCenter: _splineCenter,
  splinePosition: _splinePosition,
  tangent: _tangent,
  trackUp: _trackUp,
}

const computeBoost = (ship: Ship, spline: TrackSpline, dt: number) => {
  const { clamped } = splineLane(spline, ship.pose.lapProgress, ship.lane)
  const isOnTile = spline.boostPulseAt(ship.pose.lapProgress, clamped) >= 0
  const timer = isOnTile ? BOOST_DURATION : Math.max(0, ship.boost.timer - dt)

  const isActive = timer > 0
  const target = isActive ? 1 : 0
  const lerp = isActive ? BOOST_RAMP_UP_LERP : BOOST_RAMP_DOWN_LERP
  const alpha = 1 - Math.exp(-dt * lerp)
  const factor = ship.boost.factor + (target - ship.boost.factor) * alpha

  return { factor, timer }
}

const computeAdvance = (ship: Ship, boostFactor: number, splineCount: number, packBias: number, dt: number) => {
  // Collision impulse decays toward zero whether or not we're racing.
  const collisionOffset = ship.lane.collisionOffset * Math.exp(-dt * COLLISION_OFFSET_DECAY)

  let lapProgress = ship.pose.lapProgress
  let launchProgress = ship.speed.launchProgress
  let splineIndex = ship.pose.splineIndex
  let startFade = ship.lane.startFade

  // Hold every ship on its grid spot until the gantry goes GREEN.
  if (isRacing()) {
    const launchAlpha = 1 - Math.exp(-dt * LAUNCH_RAMP_LERP)
    const laneFadeAlpha = 1 - Math.exp(-dt * START_LANE_FADE_LERP)
    launchProgress += (1 - launchProgress) * launchAlpha
    startFade += (1 - startFade) * laneFadeAlpha

    const speedSine = Math.sin(lapProgress * ship.speed.frequency * TWO_PI + ship.speed.phase)
    const intrinsic = 1 + packBias + speedSine * ship.speed.amplitude
    const audioBoost = 1 + audioState.bass * BASS_GAIN + audioState.kick * KICK_GAIN
    const barSurge = 1 + Math.sin((audioState.barPhase + ship.speed.barOffset) * TWO_PI) * BAR_GAIN
    const tileBoost = 1 + boostFactor * (BOOST_TILE_GAIN - 1)
    const speedFactor =
      intrinsic *
      audioBoost *
      barSurge *
      tileBoost *
      calculateShipSpeedMultiplier() *
      calculateBpmSpeedMultiplier() *
      launchProgress

    const stressFactor = Math.max(0, 1 - ship.lane.wallStress)
    const advanced = (lapProgress + BASE_SPEED * speedFactor * stressFactor * dt) % 1

    if (advanced < lapProgress) {
      splineIndex = pickSplineIndex(splineCount)
    }

    lapProgress = advanced
  }

  return {
    lane: { collisionOffset, startFade },
    pose: { lapProgress, splineIndex },
    speed: { launchProgress },
  }
}

// Returns module-level _sample; caller must consume before any other call to samplePath.
const samplePath = (spline: TrackSpline, lapProgress: number, lane: Ship['lane']): PathSample => {
  spline.curve.getPointAt(lapProgress, _curvePoint)
  spline.curve.getTangentAt(lapProgress, _tangent).normalize()
  sampleTrackUp(spline, lapProgress, _trackUp)
  _basisX.crossVectors(_trackUp, _tangent).normalize()

  const laneSample = splineLane(spline, lapProgress, lane, lane.collisionOffset)

  _splineCenter.copy(_curvePoint).addScaledVector(_trackUp, SHIP_HOVER_HEIGHT)
  _splinePosition.copy(_splineCenter).addScaledVector(_basisX, laneSample.clamped)

  _sample.desiredLane = laneSample.desired
  _sample.innerMax = laneSample.innerMax
  _sample.innerMin = laneSample.innerMin
  _sample.lane = laneSample.clamped

  return _sample
}

const computeWallStress = (
  currentWallStress: number,
  previousDesired: number,
  sample: PathSample,
  dt: number,
): number => {
  const decayed = Math.max(0, currentWallStress - dt * WALL_STRESS_DECAY)

  if (sample.desiredLane === sample.lane) {
    return decayed
  }

  const safeLaneDt = Math.max(dt, 1e-4)
  const laneVelocity = (sample.desiredLane - previousDesired) / safeLaneDt
  const wallSign = sample.desiredLane > sample.lane ? 1 : -1
  const intoWall = Math.max(0, laneVelocity * wallSign)
  const target = Math.min(1, intoWall / SEVERE_WALL_VELOCITY)

  return Math.max(decayed, target)
}

// Vertical flight integration (gravity, launch, landing). Caller consumes
// the returned position/velocity directly via clampToTrack — they're never
// used standalone.
const computeFlight = (
  position: Vector3,
  velocity: Vector3,
  isAirborne: boolean,
  sample: PathSample,
  splineVelocity: Vector3,
  dt: number,
) => {
  const horizontalSpeed = Math.sqrt(splineVelocity.x * splineVelocity.x + splineVelocity.z * splineVelocity.z)

  if (!isAirborne) {
    const launchThreshold = horizontalSpeed * Math.tan(LAUNCH_ANGLE)

    if (splineVelocity.y < -launchThreshold && horizontalSpeed > 1) {
      const launched = splineVelocity.clone()
      launched.y = Math.max(launched.y, -launchThreshold)

      return { isAirborne: true, position: position.clone(), velocity: launched }
    }

    return { isAirborne: false, position: sample.splinePosition.clone(), velocity: splineVelocity.clone() }
  }

  const newVelocity = velocity.clone()
  newVelocity.y -= AIR_GRAVITY * dt
  const newPosition = position.clone().addScaledVector(newVelocity, dt)

  if (newPosition.y <= sample.splinePosition.y) {
    return { isAirborne: false, position: sample.splinePosition.clone(), velocity: splineVelocity.clone() }
  }

  return { isAirborne: true, position: newPosition, velocity: newVelocity }
}

// Lateral wall containment applied to the flight result. Returns the
// possibly-corrected position/velocity (or the same refs if no correction).
const clampToTrack = (position: Vector3, velocity: Vector3, sample: PathSample) => {
  const { basisX, innerMax, innerMin, splineCenter } = sample
  const dx = position.x - splineCenter.x
  const dy = position.y - splineCenter.y
  const dz = position.z - splineCenter.z
  const lateralActual = dx * basisX.x + dy * basisX.y + dz * basisX.z
  const clampedLateral = clamp(lateralActual, innerMin, innerMax)
  const lateralCorrection = clampedLateral - lateralActual

  if (lateralCorrection === 0) {
    return { position, velocity }
  }

  const newPosition = position.clone()
  newPosition.x += lateralCorrection * basisX.x
  newPosition.y += lateralCorrection * basisX.y
  newPosition.z += lateralCorrection * basisX.z

  const lateralVelocity = velocity.x * basisX.x + velocity.y * basisX.y + velocity.z * basisX.z

  if (lateralCorrection * lateralVelocity >= 0) {
    return { position: newPosition, velocity }
  }

  const newVelocity = velocity.clone()
  newVelocity.x -= lateralVelocity * basisX.x
  newVelocity.y -= lateralVelocity * basisX.y
  newVelocity.z -= lateralVelocity * basisX.z

  return { position: newPosition, velocity: newVelocity }
}

// One frame of physics integration: vertical flight + lateral wall clamp.
// The intermediate flight position/velocity exist only as inputs to the clamp
// — folding the two avoids a throwaway return.
const tickPhysics = (
  position: Vector3,
  velocity: Vector3,
  isAirborne: boolean,
  sample: PathSample,
  splineVelocity: Vector3,
  dt: number,
) => {
  const flight = computeFlight(position, velocity, isAirborne, sample, splineVelocity, dt)
  const clamped = clampToTrack(flight.position, flight.velocity, sample)

  return { isAirborne: flight.isAirborne, position: clamped.position, velocity: clamped.velocity }
}

// Returns module-level _orientationTangent; caller must consume immediately.
const computeOrientationTangent = (velocity: Vector3, isAirborne: boolean, sample: PathSample): Vector3 => {
  const speedSq = velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z

  if (isAirborne && speedSq > 1) {
    const speed = Math.sqrt(speedSq)
    _orientationTangent.set(velocity.x / speed, velocity.y / speed, velocity.z / speed)
  } else {
    _orientationTangent.copy(sample.tangent)
  }

  const maxSinY = Math.sin(MAX_ORIENT_PITCH)

  if (Math.abs(_orientationTangent.y) > maxSinY) {
    const sign = _orientationTangent.y >= 0 ? 1 : -1
    const horizontalMagnitude = Math.sqrt(
      _orientationTangent.x * _orientationTangent.x + _orientationTangent.z * _orientationTangent.z,
    )

    if (horizontalMagnitude > 1e-6) {
      const newHorizontalMagnitude = Math.sqrt(1 - maxSinY * maxSinY)
      const scale = newHorizontalMagnitude / horizontalMagnitude
      _orientationTangent.x *= scale
      _orientationTangent.z *= scale
      _orientationTangent.y = sign * maxSinY
    }
  }

  return _orientationTangent
}

const computePitch = (currentPitch: number, velocity: Vector3, sample: PathSample, dt: number): number => {
  const { tangent } = sample
  const tangentHorizontalMagnitude = Math.max(Math.sqrt(tangent.x * tangent.x + tangent.z * tangent.z), 1e-6)
  const horizontalVelocity = Math.max(Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z), 1e-3)

  const pitchTarget = clamp(
    Math.atan2(velocity.y, horizontalVelocity) - Math.atan2(tangent.y, tangentHorizontalMagnitude),
    -MAX_PITCH,
    MAX_PITCH,
  )

  const pitchAlpha = 1 - Math.exp(-dt * PITCH_LERP)

  return currentPitch + (pitchTarget - currentPitch) * pitchAlpha
}

const computeRoll = (
  currentRoll: number,
  spline: TrackSpline,
  sample: PathSample,
  lapProgress: number,
  dt: number,
): number => {
  spline.curve.getTangentAt((lapProgress + LOOK_AHEAD) % 1, _aheadTangent).normalize()
  const turn = _aheadTangent.dot(sample.basisX) - sample.tangent.dot(sample.basisX)
  const targetRoll = clamp(-turn * ROLL_GAIN, -MAX_ROLL, MAX_ROLL)
  const rollAlpha = 1 - Math.exp(-dt * ROLL_LERP)

  return currentRoll + (targetRoll - currentRoll) * rollAlpha
}

// Returns module-level _quaternion; caller must consume immediately.
const composeQuaternion = (
  orientation: Vector3,
  sample: PathSample,
  pitch: number,
  roll: number,
  isAirborne: boolean,
): Quaternion => {
  sample.basisX.crossVectors(sample.trackUp, orientation).normalize()
  _basisY.crossVectors(orientation, sample.basisX).normalize()
  _basisZ.copy(orientation)
  _matrix.makeBasis(sample.basisX, _basisY, _basisZ)

  _quaternion.setFromRotationMatrix(_matrix).multiply(CORRECTION)
  _rollQuaternion.setFromAxisAngle(orientation, roll)
  _quaternion.premultiply(_rollQuaternion)

  if (!isAirborne) {
    _pitchQuaternion.setFromAxisAngle(sample.basisX, pitch)
    _quaternion.premultiply(_pitchQuaternion)
  }

  return _quaternion
}

export const calculatePackBias = (ship: Ship, ships: Ship[]): number => {
  // Wrap each peer's lap-gap into (-0.5, 0.5] so we measure the *shorter*
  // signed distance around the lap. Median of those gaps is "where the pack
  // sits" relative to the player; positive means the median is ahead.
  const deltas = ships
    .filter((other) => other !== ship)
    .map((other) => {
      const raw = other.pose.lapProgress - ship.pose.lapProgress

      return (((raw + 0.5) % 1) + 1) % 1 - 0.5
    })
    .sort((a, b) => a - b)

  if (deltas.length === 0) {
    return 0
  }

  const middle = Math.floor(deltas.length / 2)
  const median = deltas.length % 2 === 0 ? (deltas[middle - 1] + deltas[middle]) / 2 : deltas[middle]

  return clamp(median * LEADER_PACK_BIAS_GAIN, -LEADER_PACK_BIAS_MAX, LEADER_PACK_BIAS_MAX)
}

export const tickShip = (ship: Ship, splines: TrackSpline[], packBias: number, dt: number) => {
  const boost = computeBoost(ship, splines[ship.pose.splineIndex], dt)
  const advance = computeAdvance(ship, boost.factor, splines.length, packBias, dt)

  const advancedLane = { ...ship.lane, ...advance.lane }
  const spline = splines[advance.pose.splineIndex]
  const sample = samplePath(spline, advance.pose.lapProgress, advancedLane)

  // First frame after a splines swap: snap state to the spline. Otherwise
  // carry over the previous frame's physics state.
  let position = ship.pose.position
  let velocity = ship.pose.velocity
  let previousCurvePoint = ship.pose.previousCurvePoint
  let previousDesired = ship.lane.previousDesired
  let pitch = ship.pose.pitch
  let isAirborne = ship.pose.isAirborne

  if (!ship.isSeeded) {
    position = sample.splinePosition.clone()
    velocity = new Vector3()
    previousCurvePoint = sample.curvePoint.clone()
    previousDesired = sample.desiredLane
    pitch = 0
    isAirborne = false
  }

  const wallStress = computeWallStress(ship.lane.wallStress, previousDesired, sample, dt)
  const safeDt = Math.max(dt, 1e-4)
  const splineVelocity = _splineVelocity.subVectors(sample.curvePoint, previousCurvePoint).divideScalar(safeDt)
  const physics = tickPhysics(position, velocity, isAirborne, sample, splineVelocity, dt)

  const orientation = computeOrientationTangent(physics.velocity, physics.isAirborne, sample)
  const newPitch = computePitch(pitch, physics.velocity, sample, dt)
  const newRoll = computeRoll(ship.pose.roll, spline, sample, advance.pose.lapProgress, dt)
  const quaternion = composeQuaternion(orientation, sample, newPitch, newRoll, physics.isAirborne)

  ship.boost = boost
  ship.isSeeded = true

  ship.lane = {
    ...ship.lane,
    ...advance.lane,
    current: sample.lane,
    previousDesired: sample.desiredLane,
    wallStress,
  }

  ship.pose = {
    ...ship.pose,
    ...advance.pose,
    isAirborne: physics.isAirborne,
    pitch: newPitch,
    position: physics.position,
    previousCurvePoint: sample.curvePoint.clone(),
    roll: newRoll,
    velocity: physics.velocity,
  }

  ship.speed = {
    ...ship.speed,
    ...advance.speed,
  }

  ship.groupRef.current?.quaternion.copy(quaternion)
  ship.groupRef.current?.position.copy(physics.position)
}
