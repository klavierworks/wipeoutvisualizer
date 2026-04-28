import { useEffect, useRef, useState } from 'react'

import type { TrackSpline } from '../../../constructor/trackSpline'

import { RACER_COUNT } from '../../../constants'
import { makeShip, pickSplineIndex, type Ship } from './ship'

const CAMERA_TARGET_INDEX = 0

export type ShipFleet = {
  ships: Ship[]
}

const buildShips = (splines: TrackSpline[]): Ship[] =>
  Array.from({ length: RACER_COUNT }, (_, index) =>
    makeShip({
      index,
      isCameraTarget: index === CAMERA_TARGET_INDEX,
      numSections: splines[0].numSections,
      splineCount: splines.length,
      startLineT: splines[0].startLineT,
      totalShips: RACER_COUNT,
    }),
  )

const useShipFleet = (splines: TrackSpline[]): ShipFleet => {
  const [ships] = useState(() => buildShips(splines))
  const previousSplinesRef = useRef(splines)

  useEffect(() => {
    if (previousSplinesRef.current === splines) {
      return
    }

    previousSplinesRef.current = splines

    for (const ship of ships) {
      ship.isSeeded = false
      ship.pose.splineIndex = pickSplineIndex(splines.length)
    }
  }, [splines, ships])

  return { ships }
}

export default useShipFleet
