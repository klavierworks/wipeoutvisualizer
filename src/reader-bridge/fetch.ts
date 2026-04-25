import { GAMEFILES } from './constants'

export const fetchBytes = async (path: string): Promise<Uint8Array> => {
  const response = await fetch(`${GAMEFILES}/${path}`)

  if (!response.ok) {
    throw new Error(`${path}: ${response.status}`)
  }

  return new Uint8Array(await response.arrayBuffer())
}

export const fetchAll = async <T extends Record<string, string>>(paths: T): Promise<{ [K in keyof T]: Uint8Array }> => {
  const keys = Object.keys(paths) as (keyof T)[]
  const values = await Promise.all(keys.map((key) => fetchBytes(paths[key])))

  return Object.fromEntries(keys.map((key, i) => [key, values[i]])) as { [K in keyof T]: Uint8Array }
}
