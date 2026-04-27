import { Vector3 } from 'three'

import type { TrackSpline } from '../../../constructor/trackSpline'

import { SECTION_LABEL_HEIGHT } from '../../../constants'
import { sampleTrackUp } from '../Ships/splineSampling'

export type SectionLabel = {
  index: number
  position: Vector3
}

export const buildSectionLabels = (spline: TrackSpline): SectionLabel[] => {
  const labels: SectionLabel[] = []
  const point = new Vector3()
  const up = new Vector3()

  for (let i = 0; i < spline.order.length; i++) {
    const t = i / spline.order.length

    spline.curve.getPointAt(t, point)
    sampleTrackUp(spline, t, up)

    labels.push({
      index: spline.order[i],
      position: point.clone().addScaledVector(up, SECTION_LABEL_HEIGHT),
    })
  }

  return labels
}
