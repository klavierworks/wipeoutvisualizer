import { type ChangeEvent, useCallback, useRef, useState } from 'react'

import styles from './SourcePicker.module.css'
import { is } from '@react-three/fiber/dist/declarations/src/core/utils'

type SourcePickerProps = {
  onPickAbout: () => void
  onPickFile: (file: File) => void
  onPickMic: () => void
}

const TITLE = 'Wipeout Visualizer'

const SourcePicker = ({ onPickAbout, onPickFile, onPickMic }: SourcePickerProps) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const [isUploading, setIsUploading] = useState(false)
  const handleBrowse = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]

      if (file) {
        onPickFile(file)
        setIsUploading(true)
        setHoveredButton(null)
      }
    },
    [onPickFile],
  )

  const [hoveredButton, setHoveredButton] = useState<null | string>(null)

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h1 className={styles.title}>{TITLE}</h1>
        {
          !isUploading && (
            <div className={styles.buttons}>
              <input
                accept="audio/*"
                className={styles.fileInput}
                onChange={handleInputChange}
                ref={inputRef}
                type="file"
              />
              <button 
                className={styles.button}
                onClick={handleBrowse}
                onPointerOut={() => setHoveredButton(null)}
                onPointerOver={() => setHoveredButton('file')}
                type="button"
              >
                <span className={styles.buttonLabel}>File</span>
              </button>
              <button
                className={styles.button}
                onClick={onPickMic}
                onPointerOut={() => setHoveredButton(null)}
                onPointerOver={() => setHoveredButton('mic')}
                type="button"
              >
                <span className={styles.buttonLabel}>Live</span>
              </button>
              <button 
                className={styles.button}
                onClick={onPickAbout}
                onPointerOut={() => setHoveredButton(null)}
                onPointerOver={() => setHoveredButton('about')}
                type="button"
              >
                <span className={styles.buttonLabel}>About</span>
              </button>
            </div>
          )
        }
        <p className={styles.message}>
          {
            isUploading ? 'Processing audio file...' : (
              <>
                {
                  hoveredButton === null ? 'Choose an audio source' : null
                }
                {
                  hoveredButton === 'file' ? 'Select an audio file to visualize' : null
                }
                {
                  hoveredButton === 'mic' ? 'Use microphone for live visualization' : null
                }
                {
                  hoveredButton === 'about' ? 'Learn more about this project' : null
                }
              </>
            )
          }
        </p>
      </div>
    </div>
  )
}

export default SourcePicker
