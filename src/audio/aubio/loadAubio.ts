import type { Aubio } from 'aubiojs'

import aubio from 'aubiojs'

let cached: null | Promise<Aubio> = null

export const loadAubio = (): Promise<Aubio> => {
  if (!cached) {
    cached = aubio()
  }

  return cached
}
