import init, * as reader from '../../reader/pkg/reader.js'

let readyPromise: Promise<typeof reader> | null = null

export const getReader = (): Promise<typeof reader> => {
  if (!readyPromise) {
    readyPromise = init().then(() => reader)
  }
  return readyPromise
}
