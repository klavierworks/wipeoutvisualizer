import { Mesh, MeshBasicMaterial, TubeGeometry } from 'three'

import type { TrackSpline } from '../../../constructor/trackSpline'

import {
  SPLINE_DEBUG_ALTERNATE,
  SPLINE_DEBUG_PRIMARY,
  SPLINE_DEBUG_RADIAL_SEGMENTS,
  SPLINE_DEBUG_RADIUS,
  SPLINE_DEBUG_TUBULAR_SEGMENTS,
} from '../../../constants'

export const buildSplineDebugMeshes = (splines: TrackSpline[]): Mesh[] =>
  splines.map((spline, i) => {
    const geometry = new TubeGeometry(
      spline.curve,
      SPLINE_DEBUG_TUBULAR_SEGMENTS,
      SPLINE_DEBUG_RADIUS,
      SPLINE_DEBUG_RADIAL_SEGMENTS,
      true,
    )
    const material = new MeshBasicMaterial({ color: i === 0 ? SPLINE_DEBUG_PRIMARY : SPLINE_DEBUG_ALTERNATE })

    return new Mesh(geometry, material)
  })
