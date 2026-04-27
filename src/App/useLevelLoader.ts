import { useEffect, useState } from 'react'

import type { StartwadAssets } from '../reader-bridge'

import { FAKE_LOAD_LEVELS_MS, FAKE_LOAD_STARTWAD_MS, START_LINE_SECTION_BY_TRACK } from '../constants'
import { type Built, type BuiltExtras, construct, constructExtras } from '../constructor'
import { fakeLoadingDelay } from '../fakeLoading'
import { loadExtras, loadStartwadAssets, loadTrack } from '../reader-bridge'

export type LevelLoadResult = {
  extras: BuiltExtras | null
  levels: LoadedLevel[] | null
  startwad: null | StartwadAssets
}

export type LoadedLevel = {
  built: Built
  path: string
}

const loadOneLevel = async (path: string): Promise<LoadedLevel | null> => {
  try {
    const start = performance.now()
    const data = await loadTrack(path)
    const built = construct(data, START_LINE_SECTION_BY_TRACK[path] ?? 0)

    console.log(`[load] ${path} in ${(performance.now() - start).toFixed(0)}ms`)

    return { built, path }
  } catch (error) {
    console.warn(`[load] ${path} failed`, error)

    return null
  }
}

const loadAllExtras = async (startwad: StartwadAssets): Promise<BuiltExtras | null> => {
  try {
    const start = performance.now()
    const built = constructExtras(await loadExtras(startwad))

    console.log(
      `[load] extras (${Object.keys(built.meshes).length} meshes, ${Object.keys(built.atlases).length} atlases) in ${(performance.now() - start).toFixed(0)}ms`,
    )
    console.log(built)

    return built
  } catch (error) {
    console.warn('[load] extras failed', error)

    return null
  }
}

export const useLevelLoader = (levelPaths: string[]): LevelLoadResult => {
  const [levels, setLevels] = useState<LoadedLevel[] | null>(null)
  const [extras, setExtras] = useState<BuiltExtras | null>(null)
  const [startwad, setStartwad] = useState<null | StartwadAssets>(null)

  useEffect(() => {
    let isCancelled = false

    const run = async () => {
      await fakeLoadingDelay(FAKE_LOAD_STARTWAD_MS)

      const startwadAssets = await loadStartwadAssets()

      if (isCancelled) {
        return
      }

      setStartwad(startwadAssets)

      await fakeLoadingDelay(FAKE_LOAD_LEVELS_MS)

      if (isCancelled) {
        return
      }

      const [extrasBuilt, levelResults] = await Promise.all([
        loadAllExtras(startwadAssets),
        Promise.all(levelPaths.map(loadOneLevel)),
      ])

      if (isCancelled) {
        return
      }

      const loadedLevels = levelResults.filter((entry): entry is LoadedLevel => entry !== null)

      if (loadedLevels.length === 0) {
        console.error('[load] no levels loaded')

        return
      }

      setLevels(loadedLevels)
      setExtras(extrasBuilt)
    }

    run().catch((error) => console.error('[load] failed', error))

    return () => {
      isCancelled = true
    }
  }, [levelPaths])

  return { extras, levels, startwad }
}
