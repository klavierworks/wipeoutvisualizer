import type { MutableRefObject } from 'react'

import { Group, Matrix4, Quaternion, Vector3 } from 'three'

import type { TrackSpline } from '../../../constructor/trackSpline'
import type { RacerConfig } from './racerConfig'

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
import { pickSplineIndex } from './racerConfig'
import { clamp, sampleTrackUp, splineLane } from './splineSampling'

export type RacerMotion = {
  boostFactor: number
  boostTimer: number
  // Lateral lane impulse from a recent ship-vs-ship collision. Added to the
  // racer's desired lane each frame and decayed back toward zero so contacts
  // read as a brief sideswipe rather than a permanent shift.
  collisionLaneOffset: number
  isAirborne: boolean
  isSeeded: boolean
  launchProgress: number
  pitch: number
  position: Vector3
  previousCurvePoint: Vector3
  previousDesiredLane: number
  roll: number
  splineIndex: number
  startLaneFade: number
  t: number
  velocity: Vector3
  wallStress: number
}

export const makeRacerMotion = (config: RacerConfig): RacerMotion => ({
  boostFactor: 0,
  boostTimer: 0,
  collisionLaneOffset: 0,
  isAirborne: false,
  isSeeded: false,
  launchProgress: 0,
  pitch: 0,
  position: new Vector3(),
  previousCurvePoint: new Vector3(),
  previousDesiredLane: 0,
  roll: 0,
  splineIndex: config.splineIndex,
  startLaneFade: 0,
  t: config.startT,
  velocity: new Vector3(),
  wallStress: 0,
})

export type LeaderOutputs = {
  groupRef: MutableRefObject<Group | null>
  splineIndexRef: MutableRefObject<number>
  tRef: MutableRefObject<number>
}

export type PathSample = {
  basisX: Vector3
  // Raw curve point at motion.t — no hover or lane offset. Used as the
  // reference for splineVelocity so that trackUp rotation across banked /
  // ramp transitions doesn't leak into the y-velocity the airborne and
  // pitch logic read.
  curvePoint: Vector3
  desiredLane: number
  innerMax: number
  innerMin: number
  lane: number
  splineCenter: Vector3
  splinePosition: Vector3
  splineVelocity: Vector3
  tangent: Vector3
  trackUp: Vector3
}

export type RacerOutputs = {
  lanes: MutableRefObject<Float32Array>
  splineIndexes: MutableRefObject<Int32Array>
  ts: MutableRefObject<Float32Array>
}

const _position = new Vector3()
const _tangent = new Vector3()
const _trackUp = new Vector3()
const _basisX = new Vector3()
const _basisY = new Vector3()
const _basisZ = new Vector3()
const _matrix = new Matrix4()
const _aheadTangent = new Vector3()
const _orientationTangent = new Vector3()
const _splinePosition = new Vector3()
const _splineCenter = new Vector3()
const _splineVelocity = new Vector3()
const _rollQuaternion = new Quaternion()
const _pitchQuaternion = new Quaternion()

const _sample: PathSample = {
  basisX: _basisX,
  curvePoint: _position,
  desiredLane: 0,
  innerMax: 0,
  innerMin: 0,
  lane: 0,
  splineCenter: _splineCenter,
  splinePosition: _splinePosition,
  splineVelocity: _splineVelocity,
  tangent: _tangent,
  trackUp: _trackUp,
}

const audioBassBoost = (): number => 1 + audioState.bass * BASS_GAIN + audioState.kick * KICK_GAIN

const isOnBoostTile = (spline: TrackSpline, t: number, lane: number): boolean => spline.boostPulseAt(t, lane) >= 0

export const updateBoostState = (
  motion: RacerMotion,
  spline: TrackSpline,
  config: RacerConfig,
  dt: number,
): void => {
  const { clamped } = splineLane(spline, motion.t, config, motion.startLaneFade)

  if (isOnBoostTile(spline, motion.t, clamped)) {
    motion.boostTimer = BOOST_DURATION
  } else {
    motion.boostTimer = Math.max(0, motion.boostTimer - dt)
  }

  const isActive = motion.boostTimer > 0
  const target = isActive ? 1 : 0
  const lerp = isActive ? BOOST_RAMP_UP_LERP : BOOST_RAMP_DOWN_LERP
  const alpha = 1 - Math.exp(-dt * lerp)

  motion.boostFactor += (target - motion.boostFactor) * alpha
}

export const calculateLeaderPackBias = (motion: RacerMotion, motions: RacerMotion[]): number => {
  // Wrap each peer's t-gap into (-0.5, 0.5] so we measure the *shorter* signed
  // distance around the lap. Median of those gaps is "where the pack sits"
  // relative to the player; positive means the median is ahead.
  const deltas = motions
    .filter((other) => other !== motion)
    .map((other) => {
      const raw = other.t - motion.t

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

export const advanceAlongSpline = (
  motion: RacerMotion,
  config: RacerConfig,
  splineCount: number,
  packBias: number,
  dt: number,
): void => {
  // Decay any pending collision-impulse lane offset toward zero (regardless of
  // racing state — we still want pre-race nudges to settle).
  motion.collisionLaneOffset *= Math.exp(-dt * COLLISION_OFFSET_DECAY)
  // Hold every racer on its grid spot until the gantry goes GREEN.
  if (!isRacing()) {
    return
  }

  const launchAlpha = 1 - Math.exp(-dt * LAUNCH_RAMP_LERP)
  const laneFadeAlpha = 1 - Math.exp(-dt * START_LANE_FADE_LERP)

  motion.launchProgress += (1 - motion.launchProgress) * launchAlpha
  motion.startLaneFade += (1 - motion.startLaneFade) * laneFadeAlpha

  const speedSine = Math.sin(motion.t * config.speedFrequency * TWO_PI + config.speedPhase)
  const intrinsic = 1 + packBias + speedSine * config.speedAmplitude
  const barSurge = 1 + Math.sin((audioState.barPhase + config.barOffset) * TWO_PI) * BAR_GAIN
  const tileBoost = 1 + motion.boostFactor * (BOOST_TILE_GAIN - 1)
  const sectionEnergyMultiplier = calculateShipSpeedMultiplier()
  const bpmMultiplier = calculateBpmSpeedMultiplier()
  const speedFactor =
    intrinsic *
    audioBassBoost() *
    barSurge *
    tileBoost *
    sectionEnergyMultiplier *
    bpmMultiplier *
    motion.launchProgress

    if (config.startLane === 0) {
      console.log(config,speedFactor)
    } else {
      console.log(config)
    }
  const stressFactor = Math.max(0, 1 - motion.wallStress)
  const previousT = motion.t

  motion.t = (motion.t + BASE_SPEED * speedFactor * stressFactor * dt) % 1

  if (motion.t < previousT) {
    motion.splineIndex = pickSplineIndex(splineCount)
  }
}

export const samplePath = (spline: TrackSpline, motion: RacerMotion, config: RacerConfig): PathSample => {
  spline.curve.getPointAt(motion.t, _position)
  spline.curve.getTangentAt(motion.t, _tangent).normalize()
  sampleTrackUp(spline, motion.t, _trackUp)
  _basisX.crossVectors(_trackUp, _tangent).normalize()

  const lane = splineLane(spline, motion.t, config, motion.startLaneFade, motion.collisionLaneOffset)

  _splineCenter.copy(_position).addScaledVector(_trackUp, SHIP_HOVER_HEIGHT)
  _splinePosition.copy(_splineCenter).addScaledVector(_basisX, lane.clamped)

  _sample.desiredLane = lane.desired
  _sample.innerMax = lane.innerMax
  _sample.innerMin = lane.innerMin
  _sample.lane = lane.clamped

  return _sample
}

export const writeOutputs = (
  motion: RacerMotion,
  sample: PathSample,
  index: number,
  leader: LeaderOutputs | undefined,
  racer: RacerOutputs | undefined,
): void => {
  if (leader) {
    leader.tRef.current = motion.t
    leader.splineIndexRef.current = motion.splineIndex
  }

  if (racer) {
    racer.ts.current[index] = motion.t
    racer.lanes.current[index] = sample.lane
    racer.splineIndexes.current[index] = motion.splineIndex
  }
}

export const seedMotion = (motion: RacerMotion, sample: PathSample): void => {
  motion.position.copy(sample.splinePosition)
  motion.velocity.set(0, 0, 0)
  motion.previousCurvePoint.copy(sample.curvePoint)
  motion.previousDesiredLane = sample.desiredLane
  motion.pitch = 0
  motion.isAirborne = false
  motion.isSeeded = true
}

export const updateWallStress = (motion: RacerMotion, sample: PathSample, dt: number): void => {
  motion.wallStress = Math.max(0, motion.wallStress - dt * WALL_STRESS_DECAY)

  if (sample.desiredLane !== sample.lane) {
    const safeLaneDt = Math.max(dt, 1e-4)
    const laneVelocity = (sample.desiredLane - motion.previousDesiredLane) / safeLaneDt
    const wallSign = sample.desiredLane > sample.lane ? 1 : -1
    const intoWall = Math.max(0, laneVelocity * wallSign)
    const target = Math.min(1, intoWall / SEVERE_WALL_VELOCITY)

    if (target > motion.wallStress) {
      motion.wallStress = target
    }
  }

  motion.previousDesiredLane = sample.desiredLane
}

export const updateSplineVelocity = (motion: RacerMotion, sample: PathSample, dt: number): void => {
  const safeDt = Math.max(dt, 1e-4)

  sample.splineVelocity.subVectors(sample.curvePoint, motion.previousCurvePoint).divideScalar(safeDt)
  motion.previousCurvePoint.copy(sample.curvePoint)
}

export const updateFlight = (motion: RacerMotion, sample: PathSample, dt: number): void => {
  const horizontalSpeed = Math.sqrt(
    sample.splineVelocity.x * sample.splineVelocity.x + sample.splineVelocity.z * sample.splineVelocity.z,
  )

  if (!motion.isAirborne) {
    const launchThreshold = horizontalSpeed * Math.tan(LAUNCH_ANGLE)

    if (sample.splineVelocity.y < -launchThreshold && horizontalSpeed > 1) {
      motion.isAirborne = true
      motion.velocity.copy(sample.splineVelocity)
      motion.velocity.y = Math.max(motion.velocity.y, -launchThreshold)
    } else {
      motion.position.copy(sample.splinePosition)
      motion.velocity.copy(sample.splineVelocity)
    }
  }

  if (motion.isAirborne) {
    motion.velocity.y -= AIR_GRAVITY * dt
    motion.position.addScaledVector(motion.velocity, dt)

    if (motion.position.y <= sample.splinePosition.y) {
      motion.position.copy(sample.splinePosition)
      motion.velocity.copy(sample.splineVelocity)
      motion.isAirborne = false
    }
  }
}

export const clampToTrack = (motion: RacerMotion, sample: PathSample): void => {
  const { basisX, innerMax, innerMin, splineCenter } = sample
  const dx = motion.position.x - splineCenter.x
  const dy = motion.position.y - splineCenter.y
  const dz = motion.position.z - splineCenter.z
  const lateralActual = dx * basisX.x + dy * basisX.y + dz * basisX.z
  const clampedLateral = clamp(lateralActual, innerMin, innerMax)
  const lateralCorrection = clampedLateral - lateralActual

  if (lateralCorrection === 0) {
    return
  }

  motion.position.x += lateralCorrection * basisX.x
  motion.position.y += lateralCorrection * basisX.y
  motion.position.z += lateralCorrection * basisX.z

  const lateralVelocity = motion.velocity.x * basisX.x + motion.velocity.y * basisX.y + motion.velocity.z * basisX.z

  if (lateralCorrection * lateralVelocity < 0) {
    motion.velocity.x -= lateralVelocity * basisX.x
    motion.velocity.y -= lateralVelocity * basisX.y
    motion.velocity.z -= lateralVelocity * basisX.z
  }
}

export const computeOrientationTangent = (motion: RacerMotion, sample: PathSample): Vector3 => {
  const { velocity } = motion
  const speedSq = velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z

  if (motion.isAirborne && speedSq > 1) {
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

export const buildBasisMatrix = (orientation: Vector3, sample: PathSample): Matrix4 => {
  sample.basisX.crossVectors(sample.trackUp, orientation).normalize()
  _basisY.crossVectors(orientation, sample.basisX).normalize()
  _basisZ.copy(orientation)
  _matrix.makeBasis(sample.basisX, _basisY, _basisZ)

  return _matrix
}

export const updatePitch = (motion: RacerMotion, sample: PathSample, dt: number): void => {
  const { tangent } = sample
  const tangentHorizontalMagnitude = Math.max(Math.sqrt(tangent.x * tangent.x + tangent.z * tangent.z), 1e-6)
  const horizontalVelocity = Math.max(
    Math.sqrt(motion.velocity.x * motion.velocity.x + motion.velocity.z * motion.velocity.z),
    1e-3,
  )

  const pitchTarget = clamp(
    Math.atan2(motion.velocity.y, horizontalVelocity) - Math.atan2(tangent.y, tangentHorizontalMagnitude),
    -MAX_PITCH,
    MAX_PITCH,
  )

  const pitchAlpha = 1 - Math.exp(-dt * PITCH_LERP)
  motion.pitch += (pitchTarget - motion.pitch) * pitchAlpha
}

export const updateRoll = (motion: RacerMotion, spline: TrackSpline, sample: PathSample, dt: number): void => {
  spline.curve.getTangentAt((motion.t + LOOK_AHEAD) % 1, _aheadTangent).normalize()
  const turn = _aheadTangent.dot(sample.basisX) - sample.tangent.dot(sample.basisX)
  const targetRoll = clamp(-turn * ROLL_GAIN, -MAX_ROLL, MAX_ROLL)
  const rollAlpha = 1 - Math.exp(-dt * ROLL_LERP)

  motion.roll += (targetRoll - motion.roll) * rollAlpha
}

export const writeOrientation = (
  motion: RacerMotion,
  matrix: Matrix4,
  sample: PathSample,
  orientation: Vector3,
  target: Group,
): void => {
  target.quaternion.setFromRotationMatrix(matrix).multiply(CORRECTION)
  _rollQuaternion.setFromAxisAngle(orientation, motion.roll)
  target.quaternion.premultiply(_rollQuaternion)

  if (!motion.isAirborne) {
    _pitchQuaternion.setFromAxisAngle(sample.basisX, motion.pitch)
    target.quaternion.premultiply(_pitchQuaternion)
  }
}
