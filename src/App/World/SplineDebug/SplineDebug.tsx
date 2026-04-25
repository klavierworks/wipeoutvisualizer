import { useMemo } from 'react'

import type { TrackSpline } from '../../../constructor/trackSpline'

import { buildSplineDebugMeshes } from './buildSplineDebugMeshes'

type SplineDebugProps = {
  splines: TrackSpline[]
}

const SplineDebug = ({ splines }: SplineDebugProps) => {
  const meshes = useMemo(() => buildSplineDebugMeshes(splines), [splines])

  return (
    <>
      {meshes.map((mesh, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </>
  )
}

export default SplineDebug
