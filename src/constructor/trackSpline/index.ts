import type { TrackData } from '../../reader-bridge'
import type { TrackSpline } from './types'

import { buildBoostPulseByOriginal, buildSplineFromOrder, logSectionYOutliers } from './buildSpline'
import { buildAlternateOrders, traverseSections } from './junctions'

export { traverseSections } from './junctions'
export type { TrackSpline } from './types'

export const buildTrackSplines = (track: TrackData, startLineSection: number): TrackSpline[] => {
  const primary = traverseSections(track)
  const alternates = buildAlternateOrders(track, primary)
  const boostPulseByOriginal = buildBoostPulseByOriginal(track, primary)

  logSectionYOutliers(track, primary)

  return [primary, ...alternates].map((order) =>
    buildSplineFromOrder(order, track, boostPulseByOriginal, startLineSection),
  )
}
