import type { MutableRefObject } from 'react'

import { Group, Vector3 } from 'three'

import {
  PRIMARY_ROUTE_PROBABILITY,
  START_GRID_LANE_WIDTH,
  START_GRID_ROW_GAP_SECTIONS,
  TWO_PI,
} from '../../../constants'

export type Ship = {
  boost: {
    factor: number
    timer: number
  },
  groupRef: MutableRefObject<Group | null>
  isCameraTarget: boolean
  isSeeded: boolean
  lane: {
    amplitude: number
    collisionOffset: number
    current: number
    frequency: number
    phase: number
    previousDesired: number
    startFade: number
    startOffset: number
    wallStress: number
  }
  pose: {
    isAirborne: boolean
    lapProgress: number
    pitch: number
    position: Vector3
    previousCurvePoint: Vector3
    roll: number
    splineIndex: number
    velocity: Vector3
  }
  speed: {
    amplitude: number
    barOffset: number
    frequency: number
    launchProgress: number
    phase: number
  }
}

export const pickSplineIndex = (splineCount: number): number => {
  if (splineCount <= 1) {
    return 0
  }

  if (Math.random() < PRIMARY_ROUTE_PROBABILITY) {
    return 0
  }

  return 1 + Math.floor(Math.random() * (splineCount - 1))
}

type MakeShipArgs = {
  index: number
  isCameraTarget: boolean
  numSections: number
  splineCount: number
  startLineT: number
  totalShips: number
}

export const makeShip = ({
  index,
  isCameraTarget,
  numSections,
  splineCount,
  startLineT,
  totalShips,
}: MakeShipArgs): Ship => {
  const lateralSign = index % 2 === 0 ? 1 : -1
  const rowGapT = START_GRID_ROW_GAP_SECTIONS / numSections

  return {
    boost: {
      factor: 0,
      timer: 0,
    },
    groupRef: { current: null },
    isCameraTarget,
    isSeeded: false,
    lane: {
      amplitude: 400 + Math.random() * 600,
      collisionOffset: 0,
      current: 0,
      frequency: 1 + Math.random() * 2,
      phase: Math.random() * TWO_PI,
      previousDesired: 0,
      startFade: 0,
      startOffset: (lateralSign * START_GRID_LANE_WIDTH) / 2,
      wallStress: 0,
    },
    pose: {
      isAirborne: false,
      lapProgress: (startLineT - index * rowGapT + 1) % 1,
      pitch: 0,
      position: new Vector3(),
      previousCurvePoint: new Vector3(),
      roll: 0,
      splineIndex: pickSplineIndex(splineCount),
      velocity: new Vector3(),
    },
    speed: {
      amplitude: 0.05 + Math.random() * 0.1,
      barOffset: index / totalShips,
      frequency: 1 + Math.random() * 3,
      launchProgress: 0,
      phase: Math.random() * TWO_PI,
    },
  }
}
