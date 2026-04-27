import {
  LEADER_SPEED_BIAS,
  PRIMARY_ROUTE_PROBABILITY,
  START_GRID_LANE_WIDTH,
  START_GRID_ROW_GAP_SECTIONS,
  TWO_PI,
} from '../../../constants'

export type RacerConfig = {
  barOffset: number
  laneAmplitude: number
  laneFrequency: number
  lanePhase: number
  speedAmplitude: number
  speedBias: number
  speedFrequency: number
  speedPhase: number
  splineIndex: number
  startLane: number
  startT: number
}

export const pickSplineIndex = (count: number): number => {
  if (count <= 1) {
    return 0
  }

  if (Math.random() < PRIMARY_ROUTE_PROBABILITY) {
    return 0
  }

  return 1 + Math.floor(Math.random() * (count - 1))
}

export const makeRacerConfig = (
  index: number,
  total: number,
  splineCount: number,
  startLineT: number,
  numSections: number,
): RacerConfig => {
  const lateralSign = index % 2 === 0 ? 1 : -1
  const rowGapT = START_GRID_ROW_GAP_SECTIONS / numSections

  return {
    barOffset: index / total,
    laneAmplitude: 400 + Math.random() * 600,
    laneFrequency: 1 + Math.random() * 2,
    lanePhase: Math.random() * TWO_PI,
    speedAmplitude: 0.05 + Math.random() * 0.1,
    speedBias: index === 0 ? LEADER_SPEED_BIAS : 0,
    speedFrequency: 1 + Math.random() * 3,
    speedPhase: Math.random() * TWO_PI,
    splineIndex: pickSplineIndex(splineCount),
    startLane: (lateralSign * START_GRID_LANE_WIDTH) / 2,
    startT: (startLineT - index * rowGapT + 1) % 1,
  }
}
