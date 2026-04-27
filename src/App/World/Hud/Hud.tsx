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

const formatBytes = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`

const Hud = ({ extras, offlineSections }: HudProps) => {
  const { sectionRemaining, snapshot, tempo, trackRemaining } = useHudReadouts(offlineSections)
  const uiImages = extras ? Object.values(extras.ui.images) : []
  const uiAtlasRows = extras ? Object.entries(extras.ui.atlases) : []
  const meshNames = extras ? Object.keys(extras.meshes) : []
  const menuBytes = extras?.ui.menu?.byteLength ?? 0

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
      <div className={styles.atlases}>
        <AtlasRow images={extras?.atlases.hudIcons} label="HUD icons" />
        <AtlasRow images={extras?.atlases.pickupIcons} label="Pickup icons" />
        <AtlasRow images={extras?.atlases.effects} label="Effects" />
        <AtlasRow images={extras?.atlases.fonts} label="Fonts" />
        <AtlasRow images={uiImages} label="STARTWAD images" />
        {uiAtlasRows.map(([name, images]) => (
          <AtlasRow images={images} key={name} label={`STARTWAD ${name}`} />
        ))}
        {meshNames.length > 0 && (
          <div className={styles.atlasRow}>
            <div className={styles.atlasLabel}>Meshes ({meshNames.length})</div>
            <div className={styles.meshList}>{meshNames.join(', ')}</div>
          </div>
        )}
        {menuBytes > 0 && (
          <div className={styles.atlasRow}>
            <div className={styles.atlasLabel}>UI raw (decoder pending)</div>
            <div className={styles.meshList}>MENU.DAT {formatBytes(menuBytes)}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Hud
