import { Color } from 'three'

import { WIPEOUT_COLOR_DIVISOR } from './constants'

const channel = (value: number, shift: number): number => ((value >> shift) & 0xff) / WIPEOUT_COLOR_DIVISOR

export const u32ToColor = (value: number): Color => new Color(channel(value, 24), channel(value, 16), channel(value, 8))

export const u32ToRgb = (value: number): [number, number, number] => [
  channel(value, 24),
  channel(value, 16),
  channel(value, 8),
]
