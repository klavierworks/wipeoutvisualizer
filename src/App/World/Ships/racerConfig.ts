import { GRID_COL_WIDTH, GRID_COLS, GRID_ROW_GAP, PRIMARY_ROUTE_PROBABILITY, TWO_PI } from '../../../constants'

export type RacerConfig = {
  barOffset: number
  laneAmplitude: number
  laneFrequency: number
  lanePhase: number
  speedAmplitude: number
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

export const makeRacerConfig = (index: number, total: number, splineCount: number): RacerConfig => {
  const row = Math.floor(index / GRID_COLS)
  const col = index % GRID_COLS

  return {
    barOffset: index / total,
    laneAmplitude: 400 + Math.random() * 600,
    laneFrequency: 1 + Math.random() * 2,
    lanePhase: Math.random() * TWO_PI,
    speedAmplitude: 0.1 + Math.random() * 0.2,
    speedFrequency: 1 + Math.random() * 3,
    speedPhase: Math.random() * TWO_PI,
    splineIndex: pickSplineIndex(splineCount),
    startLane: (col - (GRID_COLS - 1) / 2) * GRID_COL_WIDTH,
    startT: (1 - row * GRID_ROW_GAP + 1) % 1,
  }
}
