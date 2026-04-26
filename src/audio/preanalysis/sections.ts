import type { SectionMarker } from './analyze.worker'

export type SectionInfo = {
  duration: number
  start: number
  strength: number
}

export const buildSections = (markers: SectionMarker[], trackDuration: number): SectionInfo[] =>
  markers.map((marker, i) => {
    const start = marker.time
    const end = i + 1 < markers.length ? markers[i + 1].time : trackDuration

    return {
      duration: Math.max(0, end - start),
      start,
      strength: marker.strength,
    }
  })
