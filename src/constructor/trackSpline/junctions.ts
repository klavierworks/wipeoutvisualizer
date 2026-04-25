import type { TrackData } from '../../reader-bridge'

export const traverseSections = (track: TrackData): number[] => {
  const order: number[] = []
  const visited = new Set<number>()
  let index = 0

  while (index >= 0 && index < track.sections.length && !visited.has(index)) {
    visited.add(index)
    order.push(index)
    index = track.sections[index].next
  }

  return order
}

const traceJunctionBranch = (
  track: TrackData,
  junctionStart: number,
  primaryPositions: Map<number, number>,
  branchPosition: number,
): null | { rejoinPosition: number; sections: number[] } => {
  const sections: number[] = []
  const visited = new Set<number>()
  let cursor = junctionStart

  while (cursor >= 0 && cursor < track.sections.length && !visited.has(cursor)) {
    const primaryPosition = primaryPositions.get(cursor)

    if (primaryPosition !== undefined && primaryPosition > branchPosition) {
      return { rejoinPosition: primaryPosition, sections }
    }

    visited.add(cursor)
    sections.push(cursor)
    cursor = track.sections[cursor].next
  }

  return null
}

export const buildAlternateOrders = (track: TrackData, primary: number[]): number[][] => {
  const primaryPositions = new Map<number, number>()

  for (let i = 0; i < primary.length; i++) {
    primaryPositions.set(primary[i], i)
  }

  const alternates: number[][] = []
  const seen = new Set<string>([primary.join(',')])

  for (let position = 0; position < primary.length; position++) {
    const section = track.sections[primary[position]]
    const junction = section.next_junction

    if (junction < 0 || junction >= track.sections.length) {
      continue
    }

    const branch = traceJunctionBranch(track, junction, primaryPositions, position)

    if (!branch) {
      continue
    }

    const order = [...primary.slice(0, position + 1), ...branch.sections, ...primary.slice(branch.rejoinPosition)]
    const key = order.join(',')

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    alternates.push(order)
  }

  return alternates
}
