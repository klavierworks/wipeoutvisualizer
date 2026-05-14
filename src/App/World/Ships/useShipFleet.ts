import { useEffect, useRef, useState } from 'react'

import type { TrackSpline } from '../../../constructor/trackSpline'

import { RACER_COUNT } from '../../../constants'
import { makeShip, pickSplineIndex, resetShipToGrid, type Ship } from './ship'

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

const resetFleetToGrid = (ships: Ship[], splines: TrackSpline[]): void => {
  for (let index = 0; index < ships.length; index++) {
    resetShipToGrid(ships[index], {
      index,
      numSections: splines[0].numSections,
      splineCount: splines.length,
      startLineT: splines[0].startLineT,
      totalShips: ships.length,
    })
  }
}

const useShipFleet = (splines: TrackSpline[], resetVersion: number): ShipFleet => {
  const [ships] = useState(() => buildShips(splines))
  const previousSplinesRef = useRef(splines)
  const previousResetRef = useRef(resetVersion)

  useEffect(() => {
    const hasSwapped = previousSplinesRef.current !== splines
    const hasReset = previousResetRef.current !== resetVersion

    if (!hasSwapped && !hasReset) {
      return
    }

    previousSplinesRef.current = splines
    previousResetRef.current = resetVersion

    if (hasReset) {
      resetFleetToGrid(ships, splines)

      return
    }

    for (const ship of ships) {
      ship.isSeeded = false
      ship.pose.splineIndex = pickSplineIndex(splines.length)
    }
  }, [splines, resetVersion, ships])

  return { ships }
}

export default useShipFleet
