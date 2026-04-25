import { LEVEL_PATHS } from '../constants'

export type LevelSelection = {
  isPinned: boolean
  paths: string[]
}

export const resolveLevelPaths = (): LevelSelection => {
  const raw = new URLSearchParams(window.location.search).get('track')

  if (raw === null) {
    return { isPinned: false, paths: LEVEL_PATHS }
  }

  const trackNumber = Number(raw)

  if (!Number.isFinite(trackNumber)) {
    console.warn(`[track] "${raw}" is not a number; loading all levels`)

    return { isPinned: false, paths: LEVEL_PATHS }
  }

  const wanted = `TRACK${String(Math.floor(trackNumber)).padStart(2, '0')}`
  const match = LEVEL_PATHS.filter((path) => path.endsWith(wanted))

  if (match.length === 0) {
    console.warn(`[track] no LEVEL_PATHS entry for ${wanted}; pinning to ${LEVEL_PATHS[0]}`)

    return { isPinned: true, paths: [LEVEL_PATHS[0]] }
  }

  return { isPinned: true, paths: match }
}
