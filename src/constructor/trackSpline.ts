import { CatmullRomCurve3, Vector3 } from 'three'
import type { TrackData, TrackFace, TrackSection, TrackVertex } from '../reader-bridge'

const TRACK_FACE_FLAG_TRACK = 1
const TRACK_FACE_FLAG_BOOST = 32

const sectionCenter = (
  section: TrackSection,
  faces: TrackFace[],
  vertices: TrackVertex[]
): Vector3 => {
  const pos = new Vector3()
  let count = 0
  for (let i = section.first_face; i < section.first_face + section.num_faces; i++) {
    const face = faces[i]
    if ((face.flags & TRACK_FACE_FLAG_TRACK) === 0) continue
    for (const idx of face.indices) {
      const v = vertices[idx]
      pos.x += v.x
      pos.y += -v.y
      pos.z += -v.z
      count++
    }
  }
  return count > 0 ? pos.divideScalar(count) : pos
}

const sectionHasBoost = (section: TrackSection, faces: TrackFace[]): boolean => {
  for (let i = section.first_face; i < section.first_face + section.num_faces; i++) {
    if ((faces[i].flags & TRACK_FACE_FLAG_BOOST) !== 0) return true
  }
  return false
}

type Centerline = { points: Vector3[]; boosts: boolean[] }

// Visit sections in `next`-link order. Exported so other builders can share
// the same ordering when deriving per-section data keyed by the spline's t.
export const traverseSections = (track: TrackData): number[] => {
  const order: number[] = []
  const visited = new Set<number>()
  let idx = 0
  while (idx >= 0 && idx < track.sections.length && !visited.has(idx)) {
    visited.add(idx)
    order.push(idx)
    idx = track.sections[idx].next
  }
  return order
}

const centerlinePath = (track: TrackData): Centerline => {
  const points: Vector3[] = []
  const boosts: boolean[] = []
  for (const idx of traverseSections(track)) {
    const section = track.sections[idx]
    points.push(sectionCenter(section, track.faces, track.vertices))
    boosts.push(sectionHasBoost(section, track.faces))
  }
  return { points, boosts }
}

export type TrackSpline = {
  curve: CatmullRomCurve3
  boostAtT: (t: number) => boolean
}

export const buildTrackSpline = (track: TrackData): TrackSpline => {
  const { points, boosts } = centerlinePath(track)
  const curve = new CatmullRomCurve3(points, true, 'catmullrom', 0.5)
  const n = boosts.length
  // t is arc-length normalized; sections are close to uniform length, so
  // rounding to the nearest point index is a good-enough mapping to flags.
  const boostAtT = (t: number): boolean => {
    if (n === 0) return false
    const i = Math.floor(((t % 1) + 1) % 1 * n)
    return boosts[i]
  }
  return { curve, boostAtT }
}
