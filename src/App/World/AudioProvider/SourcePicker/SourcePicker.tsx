import { type ChangeEvent, useCallback, useRef, useState } from 'react'

import styles from './SourcePicker.module.css'

type HoveredButton = 'about' | 'file' | 'mic' | null

type SourcePickerProps = {
  errorMessage: null | string
  isLoading: boolean
  onPickAbout: () => void
  onPickFile: (file: File) => void
  onPickMic: () => void
}

const TITLE = 'Wipeout Visualizer'

const resolveStatusMessage = (hovered: HoveredButton): string => {
  if (hovered === 'file') {
    return 'Select an audio file to visualize'
  }

  if (hovered === 'mic') {
    return 'Use microphone for live visualization'
  }

  if (hovered === 'about') {
    return 'Learn more about this project'
  }

  return 'Choose an audio source'
}

const SourcePicker = ({ errorMessage, isLoading, onPickAbout, onPickFile, onPickMic }: SourcePickerProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [hoveredButton, setHoveredButton] = useState<HoveredButton>(null)

  const handleBrowse = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]

      if (file) {
        onPickFile(file)
        setHoveredButton(null)
      }
    },
    [onPickFile],
  )

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h1 className={styles.title}>{TITLE}</h1>
        {!isLoading && (
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
        )}
        <p className={styles.message}>{isLoading ? 'Processing audio…' : resolveStatusMessage(hoveredButton)}</p>
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
      </div>
    </div>
  )
}

export default SourcePicker
