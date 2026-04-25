import type { DecodedImage } from '../../../../reader-bridge'

import styles from '../Hud.module.css'
import AtlasImage from './AtlasImage/AtlasImage'

type AtlasRowProps = {
  images: DecodedImage[] | undefined
  label: string
}

const AtlasRow = ({ images, label }: AtlasRowProps) => {
  if (!images || images.length === 0) {
    return null
  }

  return (
    <div className={styles.atlasRow}>
      <div className={styles.atlasLabel}>{label}</div>
      <div className={styles.atlasImages}>
        {images.map((image, index) => (
          <AtlasImage image={image} key={index} />
        ))}
      </div>
    </div>
  )
}

export default AtlasRow
