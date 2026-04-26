import { type ChangeEvent, type DragEvent, useCallback, useRef, useState } from 'react'

import styles from './SourcePicker.module.css'

type SourcePickerProps = {
  onPickFile: (file: File) => void
  onPickMic: () => void
}

const isAudioFile = (file: File): boolean =>
  file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac)$/i.test(file.name)

const SourcePicker = ({ onPickFile, onPickMic }: SourcePickerProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const handleBrowse = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]

      if (file) {
        onPickFile(file)
      }
    },
    [onPickFile],
  )

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDraggingOver(false)

      const file = event.dataTransfer.files?.[0]

      if (file && isAudioFile(file)) {
        onPickFile(file)
      }
    },
    [onPickFile],
  )

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDraggingOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false)
  }, [])

  return (
    <div className={styles.overlay}>
      <div
        className={`${styles.panel} ${isDraggingOver ? styles.panelHover : ''}`}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <p className={styles.title}>Audio Visualizer</p>
        <p className={styles.meta}>Drop an audio file here, or pick an input source.</p>
        <input
          accept="audio/*"
          className={styles.fileInput}
          onChange={handleInputChange}
          ref={inputRef}
          type="file"
        />
        <button className={styles.button} onClick={handleBrowse}>
          Choose File
        </button>
        <button className={styles.buttonSecondary} onClick={onPickMic}>
          Use Microphone
        </button>
      </div>
    </div>
  )
}

export default SourcePicker
