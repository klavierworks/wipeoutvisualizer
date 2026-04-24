const GAMEFILES = '/gamefiles'

export const fetchBytes = async (path: string): Promise<Uint8Array> => {
  const res = await fetch(`${GAMEFILES}/${path}`)
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}

export const fetchAll = async <T extends Record<string, string>>(
  paths: T
): Promise<{ [K in keyof T]: Uint8Array }> => {
  const keys = Object.keys(paths) as (keyof T)[]
  const values = await Promise.all(keys.map((k) => fetchBytes(paths[k])))
  return Object.fromEntries(keys.map((k, i) => [k, values[i]])) as { [K in keyof T]: Uint8Array }
}
