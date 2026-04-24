import { audioState, type SectionInfo } from './state'
import type { SectionMarker, TempoSegment } from './analyze.worker'

const BEATS_PER_BAR = 4

// Duration over which BPM ramps between two adjacent tempo segments. Set to
// the width of the crossfade zone centered on each segment boundary: e.g.
// RAMP_SEC = 2 means BPM interpolates across ±1s around the boundary.
const RAMP_SEC = 1

// A tempo node is an inflection point in the piecewise-linear BPM-over-time
// curve. Between two adjacent nodes BPM varies linearly; the beat counter
// integrates that ramp quadratically, so phase stays continuous whether we're
// inside a constant-tempo segment or mid-accelerando.
type TempoNode = {
  time: number
  bpm: number
  beatAtTime: number
}

// Callers keep this opaque and pass it back to tickClock.
export type TempoTable = {
  nodes: TempoNode[]
  offset: number
}

// Given piecewise-constant segments, emit a node list with linear ramps inserted
// around each boundary. Ramps get clamped so they can't exceed half of either
// adjoining segment (prevents a short segment from being entirely "ramp").
export const buildTempoTable = (segments: TempoSegment[], offset: number): TempoTable => {
  if (segments.length === 0) {
    return { nodes: [{ time: 0, bpm: 120, beatAtTime: 0 }], offset }
  }

  const raw: Array<{ time: number; bpm: number }> = [
    { time: segments[0].start, bpm: segments[0].bpm },
  ]

  for (let i = 0; i < segments.length - 1; i++) {
    const a = segments[i]
    const b = segments[i + 1]
    if (a.bpm === b.bpm) continue
    const boundary = a.end
    const halfA = Math.min(RAMP_SEC / 2, (a.end - a.start) / 2)
    const halfB = Math.min(RAMP_SEC / 2, (b.end - b.start) / 2)
    raw.push({ time: boundary - halfA, bpm: a.bpm })
    raw.push({ time: boundary + halfB, bpm: b.bpm })
  }

  const last = segments[segments.length - 1]
  raw.push({ time: last.end, bpm: last.bpm })

  raw.sort((x, y) => x.time - y.time)

  // Drop duplicate-time entries (possible when a segment is shorter than the
  // ramp on both sides); keep the later bpm so the ramp still terminates at
  // the correct target.
  const dedup: Array<{ time: number; bpm: number }> = []
  for (const n of raw) {
    const prev = dedup[dedup.length - 1]
    if (prev && Math.abs(prev.time - n.time) < 1e-6) prev.bpm = n.bpm
    else dedup.push(n)
  }

  // Integrate beat count across the piecewise-linear BPM curve. Between nodes,
  // beats accumulated = (mean bpm × dt / 60) — trapezoidal rule is exact for
  // linear segments.
  const nodes: TempoNode[] = []
  let beat = 0
  for (let i = 0; i < dedup.length; i++) {
    const cur = dedup[i]
    if (i > 0) {
      const prev = dedup[i - 1]
      const dt = cur.time - prev.time
      beat += (((prev.bpm + cur.bpm) / 2) * dt) / 60
    }
    nodes.push({ time: cur.time, bpm: cur.bpm, beatAtTime: beat })
  }

  return { nodes, offset }
}

// Linear scan with a cached hint — most frames stay in the same pair of nodes.
const findNode = (nodes: TempoNode[], t: number, hint: number): number => {
  let i = hint
  if (i < 0 || i >= nodes.length) i = 0
  while (i < nodes.length - 1 && t >= nodes[i + 1].time) i++
  while (i > 0 && t < nodes[i].time) i--
  return i
}

// Pre-compute per-section metadata once so consumers can read full details
// (start, duration, bpm, strength) without scanning at runtime. BPM is taken
// from whichever tempo segment contains the section's start — sections
// straddling a tempo change are uncommon and the start is the meaningful cue.
export const buildSections = (
  markers: SectionMarker[],
  tempoSegments: TempoSegment[],
  trackDuration: number,
): SectionInfo[] => {
  return markers.map((marker, i) => {
    const start = marker.time
    const end = i + 1 < markers.length ? markers[i + 1].time : trackDuration
    return {
      start,
      duration: Math.max(0, end - start),
      bpm: bpmAt(tempoSegments, start),
      strength: marker.strength,
    }
  })
}

const bpmAt = (segments: TempoSegment[], time: number): number => {
  for (const seg of segments) {
    if (time < seg.end) return seg.bpm
  }
  return segments[segments.length - 1]?.bpm ?? 120
}

export const tickClock = (
  currentTime: number,
  table: TempoTable,
  hint: { tempoSeg: number; section: number },
) => {
  const shifted = currentTime - table.offset
  const nodes = table.nodes
  const idx = findNode(nodes, shifted, hint.tempoSeg)
  hint.tempoSeg = idx

  const cur = nodes[idx]
  const next = idx + 1 < nodes.length ? nodes[idx + 1] : null

  let bpm: number
  let beat: number

  if (!next) {
    // Past the last node: hold final BPM and extrapolate linearly.
    bpm = cur.bpm
    const dt = shifted - cur.time
    beat = cur.beatAtTime + (bpm * dt) / 60
  } else {
    const span = next.time - cur.time
    if (span <= 0) {
      bpm = next.bpm
      beat = next.beatAtTime
    } else {
      const dt = shifted - cur.time
      const slope = (next.bpm - cur.bpm) / span
      bpm = cur.bpm + slope * dt
      // Integral of (bpm_at_cur + slope·dt) from 0 to dt, divided by 60:
      //   beat(dt) = (cur.bpm·dt + 0.5·slope·dt²) / 60
      beat = cur.beatAtTime + (cur.bpm * dt + 0.5 * slope * dt * dt) / 60
    }
  }

  const bar = beat / BEATS_PER_BAR

  audioState.time = currentTime
  audioState.bpm = bpm
  audioState.beat = beat
  audioState.beatPhase = fract(beat)
  audioState.bar = bar
  audioState.barPhase = fract(bar)
}

export const tickSection = (
  currentTime: number,
  sections: SectionMarker[],
  hint: { tempoSeg: number; section: number },
) => {
  // Find the largest section whose start is <= currentTime.
  let idx = hint.section
  while (idx + 1 < sections.length && currentTime >= sections[idx + 1].time) idx++
  while (idx > 0 && currentTime < sections[idx].time) idx--
  hint.section = idx

  const start = sections[idx]?.time ?? 0
  audioState.sectionIndex = idx
  audioState.sectionStart = start
  audioState.sectionTime = Math.max(0, currentTime - start)
}

const fract = (x: number) => {
  const f = x - Math.floor(x)
  return f < 0 ? f + 1 : f
}
