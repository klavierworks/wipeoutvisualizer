import { MutableRefObject } from 'react'

import type { BuiltTrack } from '../../../constructor/track'
import type { TrackSpline } from '../../../constructor/trackSpline'

import BoostTiles from './BoostTiles/BoostTiles'
import WeaponTiles from './WeaponTiles/WeaponTiles'

type TrackProps = {
  racerLanesRef?: MutableRefObject<Float32Array>
  racerSplineIndexesRef?: MutableRefObject<Int32Array>
  racerTsRef?: MutableRefObject<Float32Array>
  splines: TrackSpline[]
  track: BuiltTrack
}

const Track = ({ racerLanesRef, racerSplineIndexesRef, racerTsRef, splines, track }: TrackProps) => (
  <>
    <primitive object={track.mesh} />
    <WeaponTiles indices={track.weaponIndices} mesh={track.mesh} />
    <BoostTiles
      baseColor={track.boostBaseColor}
      mesh={track.mesh}
      racerLanesRef={racerLanesRef}
      racerSplineIndexesRef={racerSplineIndexesRef}
      racerTsRef={racerTsRef}
      sections={track.boostSections}
      splines={splines}
    />
  </>
)

export default Track
