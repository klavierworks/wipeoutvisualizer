export const sortedKeys = (table: Record<number, unknown>): number[] =>
  Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b)

export const lookupNumber = (table: Record<number, number>, keys: number[], key: number): number => {
  if (key <= keys[0]) {
    return table[keys[0]]
  }

  if (key >= keys[keys.length - 1]) {
    return table[keys[keys.length - 1]]
  }

  for (let i = 0; i < keys.length - 1; i++) {
    if (key >= keys[i] && key <= keys[i + 1]) {
      const t = (key - keys[i]) / (keys[i + 1] - keys[i])

      return table[keys[i]] * (1 - t) + table[keys[i + 1]] * t
    }
  }

  return 0
}

export const lookupColor = (
  table: Record<number, [number, number, number]>,
  keys: number[],
  key: number,
  out: [number, number, number],
): void => {
  if (key <= keys[0]) {
    out[0] = table[keys[0]][0]
    out[1] = table[keys[0]][1]
    out[2] = table[keys[0]][2]

    return
  }

  if (key >= keys[keys.length - 1]) {
    out[0] = table[keys[keys.length - 1]][0]
    out[1] = table[keys[keys.length - 1]][1]
    out[2] = table[keys[keys.length - 1]][2]

    return
  }

  for (let i = 0; i < keys.length - 1; i++) {
    if (key >= keys[i] && key <= keys[i + 1]) {
      const t = (key - keys[i]) / (keys[i + 1] - keys[i])
      const a = table[keys[i]]
      const b = table[keys[i + 1]]
      out[0] = a[0] * (1 - t) + b[0] * t
      out[1] = a[1] * (1 - t) + b[1] * t
      out[2] = a[2] * (1 - t) + b[2] * t

      return
    }
  }
}
