import type { Mesh } from 'three'

import { MutableRefObject, useMemo } from 'react'

import type { BoostSection } from '../../../../constructor/track'
import type { TrackSpline } from '../../../../constructor/trackSpline'

import useBoostTilesReactivity from '../../../../reactivity/useBoostTilesReactivity'

type BoostTilesProps = {
  baseColor: [number, number, number]
  mesh: Mesh
  racerLanesRef?: MutableRefObject<Float32Array>
  racerSplineIndexesRef?: MutableRefObject<Int32Array>
  racerTsRef?: MutableRefObject<Float32Array>
  sections: BoostSection[]
  splines: TrackSpline[]
}

const BoostTiles = ({
  baseColor,
  mesh,
  racerLanesRef,
  racerSplineIndexesRef,
  racerTsRef,
  sections,
  splines,
}: BoostTilesProps) => {
  const racerRefs = useMemo(() => {
    if (!racerLanesRef || !racerSplineIndexesRef || !racerTsRef) {
      return undefined
    }

    return { lanesRef: racerLanesRef, splineIndexesRef: racerSplineIndexesRef, tsRef: racerTsRef }
  }, [racerLanesRef, racerSplineIndexesRef, racerTsRef])

  useBoostTilesReactivity(mesh, sections, splines, baseColor, racerRefs)

  return null
}

export default BoostTiles
