import { Color } from 'three'

export const u32ToColor = (v: number): Color =>
  new Color(((v >> 24) & 0xff) / 0x80, ((v >> 16) & 0xff) / 0x80, ((v >> 8) & 0xff) / 0x80)

export const u32ToRgb = (v: number): [number, number, number] => [
  ((v >> 24) & 0xff) / 0x80,
  ((v >> 16) & 0xff) / 0x80,
  ((v >> 8) & 0xff) / 0x80,
]
