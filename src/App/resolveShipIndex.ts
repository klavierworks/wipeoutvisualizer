export const resolveShipIndex = (): null | number => {
  const raw = new URLSearchParams(window.location.search).get('ship')

  if (raw === null) {
    return null
  }

  const index = Number(raw)

  if (!Number.isFinite(index) || index < 0) {
    console.warn(`[ship] "${raw}" is not a valid ship index; using random`)

    return null
  }

  return Math.floor(index)
}
