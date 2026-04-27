// COMMON/STARTWAD.WAD layout (reverse-engineered; not in any published spec):
//
//   u16 LE        entry count                (always 22 in our gamefiles)
//   directory     count × 25-byte entries    each: null-terminated lowercase
//                                            filename + variable metadata. Last
//                                            4 bytes of every entry are the
//                                            file's size in 256-byte sectors,
//                                            floor-divided (size // 256).
//   data          concatenated file bodies, no padding between files.
//
// To resolve each file's actual offset/size we combine two signals:
//   1. The directory size hint locates the next file's start in a 256-byte
//      window: cursor + hint*256 .. cursor + (hint+1)*256.
//   2. Within that window, we scan for the next file's magic bytes (TIM /
//      CMP / PRM) to land precisely on the boundary. The hint alone isn't
//      enough (it loses the low 8 bits); the magic scan alone would catch
//      false positives inside larger files (a CMP magic can appear inside
//      a PRM by coincidence).

const ENTRY_SIZE = 25
const HEADER_SIZE = 2
const SECTOR = 256

const readU16LE = (data: Uint8Array, off: number): number => data[off] | (data[off + 1] << 8)

const readU32LE = (data: Uint8Array, off: number): number =>
  (data[off] | (data[off + 1] << 8) | (data[off + 2] << 16) | (data[off + 3] << 24)) >>> 0

type MagicCheck = (data: Uint8Array, off: number) => boolean

const isTimMagic: MagicCheck = (data, off) => {
  if (off + 8 > data.length) return false
  if (readU32LE(data, off) !== 0x10) return false
  const type = readU32LE(data, off + 4)
  return type === 0x02 || type === 0x08 || type === 0x09
}

const isCmpMagic: MagicCheck = (data, off) => {
  if (off + 8 > data.length) return false
  const n = readU32LE(data, off)
  if (n < 1 || n >= 200) return false
  if (off + 4 + 4 * n > data.length) return false
  for (let i = 0; i < n; i++) {
    const length = readU32LE(data, off + 4 + i * 4)
    if (length === 0 || length > 200_000) return false
  }
  return true
}

const isPrmMagic: MagicCheck = (data, off) => {
  if (off + 32 > data.length) return false
  // PRM object header begins with a 15-byte name field. Real names are
  // lowercase ASCII followed by null-padding; reject anything else.
  const first = data[off]
  if (first < 97 || first > 122) return false
  let seenNull = false
  for (let i = 1; i < 15; i++) {
    const b = data[off + i]
    if (seenNull) {
      if (b !== 0) return false
    } else if (b === 0) {
      seenNull = true
    } else if (b < 32 || b >= 127) {
      return false
    }
  }
  return true
}

const magicCheckFor = (extension: string): MagicCheck | null => {
  if (extension === 'tim') return isTimMagic
  if (extension === 'cmp') return isCmpMagic
  if (extension === 'prm') return isPrmMagic
  return null
}

const extensionOf = (filename: string): string => {
  const dot = filename.lastIndexOf('.')
  return dot < 0 ? '' : filename.slice(dot + 1).toLowerCase()
}

const stemOf = (filename: string): string => {
  const dot = filename.lastIndexOf('.')
  return (dot < 0 ? filename : filename.slice(0, dot)).toLowerCase()
}

type Entry = {
  bytes: Uint8Array
  extension: string
  name: string
  stem: string
}

export const unpackStartwad = (data: Uint8Array): Entry[] => {
  if (data.length < HEADER_SIZE) return []
  const count = readU16LE(data, 0)
  const dataStart = HEADER_SIZE + count * ENTRY_SIZE
  if (dataStart > data.length) return []

  const names: string[] = []
  const sizeHints: number[] = []
  for (let i = 0; i < count; i++) {
    const off = HEADER_SIZE + i * ENTRY_SIZE
    let nullPos = off
    while (nullPos < off + ENTRY_SIZE && data[nullPos] !== 0) nullPos++
    let name = ''
    for (let j = off; j < nullPos; j++) name += String.fromCharCode(data[j])
    names.push(name.toLowerCase())
    sizeHints.push(readU32LE(data, off + ENTRY_SIZE - 4))
  }

  // Walk file boundaries: for each entry except the last, find the next
  // entry's starting offset using its magic within the hint window.
  const offsets: number[] = []
  let cursor = dataStart
  for (let i = 0; i < names.length; i++) {
    offsets.push(cursor)
    if (i === names.length - 1) break
    const nextExtension = extensionOf(names[i + 1])
    const check = magicCheckFor(nextExtension)
    if (!check) {
      console.warn(`[startwad] unknown extension on ${names[i + 1]}; bailing`)
      offsets.length = i + 1
      break
    }
    const hint = sizeHints[i]
    const lo = cursor + hint * SECTOR
    const hi = Math.min(cursor + (hint + 1) * SECTOR, data.length)
    let found = -1
    for (let off = lo; off < hi; off++) {
      if (check(data, off)) {
        found = off
        break
      }
    }
    if (found < 0) {
      console.warn(`[startwad] no ${nextExtension} magic in window for ${names[i + 1]}`)
      offsets.length = i + 1
      break
    }
    cursor = found
  }

  const entries: Entry[] = []
  for (let i = 0; i < offsets.length; i++) {
    const start = offsets[i]
    const end = i + 1 < offsets.length ? offsets[i + 1] : data.length
    const name = names[i]
    entries.push({
      bytes: data.slice(start, end),
      extension: extensionOf(name),
      name,
      stem: stemOf(name),
    })
  }
  return entries
}
