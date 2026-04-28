import type { BuiltTrack } from '../../../constructor/track'
import type { TrackSpline } from '../../../constructor/trackSpline'
import type { Ship } from '../Ships/ship'

import BoostTiles from './BoostTiles/BoostTiles'
import WeaponTiles from './WeaponTiles/WeaponTiles'

type TrackProps = {
  ships: Ship[]
  splines: TrackSpline[]
  track: BuiltTrack
}

const Track = ({ ships, splines, track }: TrackProps) => (
  <>
    <primitive object={track.mesh} />
    <WeaponTiles indices={track.weaponIndices} mesh={track.mesh} />
    <BoostTiles
      baseColor={track.boostBaseColor}
      mesh={track.mesh}
      sections={track.boostSections}
      ships={ships}
      splines={splines}
    />
  </>
)

export default Track
