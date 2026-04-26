import type { SectionInfo } from '../../../audio/preanalysis/sections'
import type { BuiltExtras } from '../../../constructor'

import AtlasRow from './AtlasRow/AtlasRow'
import styles from './Hud.module.css'
import { useHudReadouts } from './useHudReadouts'

type HudProps = {
  extras: BuiltExtras | null
  offlineSections: null | SectionInfo[]
}

const formatStateValue = (value: unknown): string => (typeof value === 'number' ? value.toFixed(2) : String(value))

const Hud = ({ extras, offlineSections }: HudProps) => {
  const { sectionRemaining, snapshot, tempo, trackRemaining } = useHudReadouts(offlineSections)

  return (
    <div className={styles.hud}>
      <div className={styles.positions}>
        {Object.entries(snapshot).map(([key, value]) => (
          <div key={key}>
            <strong>{key}:</strong> {formatStateValue(value)}
          </div>
        ))}
      </div>
      <div className={styles.check}>
        {'Check'}
        <div className={styles.time}>{sectionRemaining}</div>
      </div>
      <div className={styles.remaining}>
        <div className={styles.time}>{trackRemaining}</div>
      </div>
      <div className={styles.speed}>
        {tempo}
        <div className={styles.bpm}>bpm</div>
      </div>
      <div className={styles.atlases} style={{ display: 'none' }}>
        <AtlasRow images={extras?.atlases.hudIcons} label="HUD icons" />
        <AtlasRow images={extras?.atlases.pickupIcons} label="Pickup icons" />
        <AtlasRow images={extras?.atlases.effects} label="Effects" />
        <AtlasRow images={extras?.atlases.fonts} label="Fonts" />
      </div>
    </div>
  )
}

export default Hud
