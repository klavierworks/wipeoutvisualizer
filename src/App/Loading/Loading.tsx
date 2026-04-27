import { useEffect, useState } from 'react'

import type { StartwadAssets } from '../../reader-bridge'

import AtlasImage from '../AtlasImage/AtlasImage'
import styles from './Loading.module.css'

type LoadingProps = {
  startwad: null | StartwadAssets
}

const TILE_INTERVAL_MS = 1000

const Loading = ({ startwad }: LoadingProps) => {
  const tiles = startwad?.atlases.wepicon ?? null
  const [tileIndex, setTileIndex] = useState(0)

  useEffect(() => {
    if (!tiles || tiles.length === 0) {
      return
    }

    const id = window.setInterval(() => {
      setTileIndex((index) => (index + 1) % tiles.length)
    }, TILE_INTERVAL_MS)

    return () => {
      window.clearInterval(id)
    }
  }, [tiles])

  return (
    <div className={styles.loading}>
      {(tiles && tiles.length > 0) ? (
        <AtlasImage className={styles.tile} image={tiles[tileIndex % tiles.length]} />
      ) : (
        <canvas style={{ width: '48px', height: '48px' }}></canvas>
      )}
      <div>Loading…</div>
    </div>
  )
}

export default Loading
