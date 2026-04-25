import type { SectionMarker, TempoSegment } from './analyze.worker'

import { BEATS_PER_BAR, RAMP_SEC } from './constants'
import { audioState, type SectionInfo } from './state'

export type TempoTable = {
  nodes: TempoNode[]
  offset: number
}

export type TickHint = {
  section: number
  tempoSegment: number
}

type RampPoint = { bpm: number; time: number }

type TempoNode = {
  beatAtTime: number
  bpm: number
  time: number
}

const insertRamps = (segments: TempoSegment[]): RampPoint[] => {
  const points: RampPoint[] = [{ bpm: segments[0].bpm, time: segments[0].start }]

  for (let i = 0; i < segments.length - 1; i++) {
    const before = segments[i]
    const after = segments[i + 1]

    if (before.bpm === after.bpm) {
      continue
    }

    const boundary = before.end
    const halfBefore = Math.min(RAMP_SEC / 2, (before.end - before.start) / 2)
    const halfAfter = Math.min(RAMP_SEC / 2, (after.end - after.start) / 2)

    points.push({ bpm: before.bpm, time: boundary - halfBefore })
    points.push({ bpm: after.bpm, time: boundary + halfAfter })
  }

  const last = segments[segments.length - 1]

  points.push({ bpm: last.bpm, time: last.end })

  return points.sort((x, y) => x.time - y.time)
}

const dedupeNearby = (points: RampPoint[]): RampPoint[] => {
  const out: RampPoint[] = []

  for (const point of points) {
    const previous = out[out.length - 1]

    if (previous && Math.abs(previous.time - point.time) < 1e-6) {
      previous.bpm = point.bpm
      continue
    }

    out.push(point)
  }

  return out
}

const integrateBeats = (points: RampPoint[]): TempoNode[] => {
  const nodes: TempoNode[] = []
  let beat = 0

  for (let i = 0; i < points.length; i++) {
    const current = points[i]

    if (i > 0) {
      const previous = points[i - 1]
      const dt = current.time - previous.time

      beat += (((previous.bpm + current.bpm) / 2) * dt) / 60
    }

    nodes.push({ beatAtTime: beat, bpm: current.bpm, time: current.time })
  }

  return nodes
}

export const buildTempoTable = (segments: TempoSegment[], offset: number): TempoTable => {
  if (segments.length === 0) {
    return { nodes: [{ beatAtTime: 0, bpm: 120, time: 0 }], offset }
  }

  return { nodes: integrateBeats(dedupeNearby(insertRamps(segments))), offset }
}

const findNode = (nodes: TempoNode[], time: number, hint: number): number => {
  let i = hint

  if (i < 0 || i >= nodes.length) {
    i = 0
  }

  while (i < nodes.length - 1 && time >= nodes[i + 1].time) {
    i++
  }

  while (i > 0 && time < nodes[i].time) {
    i--
  }

  return i
}

const bpmAt = (segments: TempoSegment[], time: number): number => {
  for (const segment of segments) {
    if (time < segment.end) {
      return segment.bpm
    }
  }

  return segments[segments.length - 1]?.bpm ?? 120
}

export const buildSections = (
  markers: SectionMarker[],
  tempoSegments: TempoSegment[],
  trackDuration: number,
): SectionInfo[] =>
  markers.map((marker, i) => {
    const start = marker.time
    const end = i + 1 < markers.length ? markers[i + 1].time : trackDuration

    return {
      bpm: bpmAt(tempoSegments, start),
      duration: Math.max(0, end - start),
      start,
      strength: marker.strength,
    }
  })

const fract = (value: number): number => {
  const f = value - Math.floor(value)

  return f < 0 ? f + 1 : f
}

const interpolateAtNode = (current: TempoNode, next: null | TempoNode, time: number): { beat: number; bpm: number } => {
  if (!next) {
    const dt = time - current.time

    return { beat: current.beatAtTime + (current.bpm * dt) / 60, bpm: current.bpm }
  }

  const span = next.time - current.time

  if (span <= 0) {
    return { beat: next.beatAtTime, bpm: next.bpm }
  }

  const dt = time - current.time
  const slope = (next.bpm - current.bpm) / span

  return {
    beat: current.beatAtTime + (current.bpm * dt + 0.5 * slope * dt * dt) / 60,
    bpm: current.bpm + slope * dt,
  }
}

export const tickClock = (currentTime: number, table: TempoTable, hint: TickHint): TickHint => {
  const shifted = currentTime - table.offset
  const nodes = table.nodes
  const index = findNode(nodes, shifted, hint.tempoSegment)
  const current = nodes[index]
  const next = index + 1 < nodes.length ? nodes[index + 1] : null
  const { beat, bpm } = interpolateAtNode(current, next, shifted)
  const bar = beat / BEATS_PER_BAR

  audioState.time = currentTime
  audioState.bpm = bpm
  audioState.beat = beat
  audioState.beatPhase = fract(beat)
  audioState.bar = bar
  audioState.barPhase = fract(bar)

  return { section: hint.section, tempoSegment: index }
}

const findSectionIndex = (sections: SectionMarker[], currentTime: number, hint: number): number => {
  let index = hint

  while (index + 1 < sections.length && currentTime >= sections[index + 1].time) {
    index++
  }

  while (index > 0 && currentTime < sections[index].time) {
    index--
  }

  return index
}

export const tickSection = (currentTime: number, sections: SectionMarker[], hint: TickHint): TickHint => {
  const index = findSectionIndex(sections, currentTime, hint.section)
  const start = sections[index]?.time ?? 0

  audioState.sectionIndex = index
  audioState.sectionStart = start
  audioState.sectionTime = Math.max(0, currentTime - start)

  return { section: index, tempoSegment: hint.tempoSegment }
}
