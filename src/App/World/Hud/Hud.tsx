import { useEffect, useState } from 'react'
import type { SectionInfo } from '../../../audio/preanalysis/sections'

import styles from './Hud.module.css'
import { useHudReadouts } from './useHudReadouts'

type HudProps = {
  leaderName: string
  offlineSections: null | SectionInfo[]
  trackName: string
}

const formatStateValue = (value: unknown): string => (typeof value === 'number' ? value.toFixed(2) : String(value))

const Hud = ({ leaderName, offlineSections, trackName }: HudProps) => {
  const { isLive, sectionLabel, sectionRemaining, snapshot, tempo, trackRemaining } = useHudReadouts(offlineSections)

  const [isShowingDetails, setIsShowingDetails] = useState(false)

  useEffect(() => {
    if (!isLive) {
      return;
    }

    let timeout = setTimeout(() => {
      setIsShowingDetails(true)
      timeout = setTimeout(() => {
        setIsShowingDetails(false)
      }, 5000);
    }, 1000)

    return () => clearTimeout(timeout)
  }, [isLive, trackName, leaderName])

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
        {sectionLabel}
        {!isLive && <div className={styles.time}>{sectionRemaining}</div>}
      </div>
      {isLive ? (
      <div className={`${styles.details} ${isShowingDetails ? styles.isShowingDetails : ''}`}>
        <div>Team: {leaderName}</div>
        <div>Track: {trackName}</div>
      </div>
      ) : (
      <div className={styles.remaining}>
        <div className={styles.time}>{trackRemaining}</div>
      </div>
      )}
      <div className={styles.speed}>
        {tempo}
        <div className={styles.bpm}>bpm</div>
      </div>
    </div>
  )
}

export default Hud
