import { Vector3 } from 'three'

const findValidNeighbor = (validity: boolean[], from: number, direction: -1 | 1): number => {
  const count = validity.length

  for (let step = 1; step < count; step++) {
    const probe = (from + step * direction + count) % count

    if (validity[probe]) {
      return probe
    }
  }

  return -1
}

export const interpolateAroundLoop = <T>(
  validity: boolean[],
  index: number,
  pickEndpoint: (validIndex: number) => T,
  blend: (before: T, after: T, t: number) => T,
  fallback: () => T,
): T => {
  const count = validity.length
  const beforeIndex = findValidNeighbor(validity, index, -1)
  const afterIndex = findValidNeighbor(validity, index, 1)

  if (beforeIndex === -1 && afterIndex === -1) {
    return fallback()
  }

  if (beforeIndex === -1) {
    return pickEndpoint(afterIndex)
  }

  if (afterIndex === -1) {
    return pickEndpoint(beforeIndex)
  }

  const distanceBefore = (index - beforeIndex + count) % count
  const distanceAfter = (afterIndex - index + count) % count
  const t = distanceBefore / (distanceBefore + distanceAfter)

  return blend(pickEndpoint(beforeIndex), pickEndpoint(afterIndex), t)
}

export const fillMissing = (raw: (null | Vector3)[]): Vector3[] => {
  const validity = raw.map((entry) => entry !== null)

  return raw.map((here, index) => {
    if (here) {
      return here
    }

    return interpolateAroundLoop<Vector3>(
      validity,
      index,
      (validIndex) => raw[validIndex]!.clone(),
      (before, after, t) => before.clone().lerp(after, t),
      () => new Vector3(),
    )
  })
}

export const smoothLoop = (points: Vector3[], passes: number, anchorY?: (null | number)[]): Vector3[] => {
  let buffer = points

  for (let pass = 0; pass < passes; pass++) {
    const count = buffer.length
    const next: Vector3[] = []

    for (let i = 0; i < count; i++) {
      const previous = buffer[(i - 1 + count) % count]
      const here = buffer[i]
      const after = buffer[(i + 1) % count]
      const anchored = anchorY?.[i]
      const y = anchored != null ? anchored : (previous.y + here.y + after.y) / 3

      next.push(new Vector3((previous.x + here.x + after.x) / 3, y, (previous.z + here.z + after.z) / 3))
    }

    buffer = next
  }

  return buffer
}
