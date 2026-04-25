import { useEffect, useState } from 'react'

import { type Built, type BuiltExtras, construct, constructExtras } from '../constructor'
import { loadExtras, loadTrack } from '../reader-bridge'

export type LevelLoadResult = {
  extras: BuiltExtras | null
  levels: Built[] | null
  progress: LoadProgress
}

export type LoadProgress = { loaded: number; total: number }

const loadOneLevel = async (path: string): Promise<Built | null> => {
  try {
    const start = performance.now()
    const data = await loadTrack(path)
    const built = construct(data)

    console.log(`[load] ${path} in ${(performance.now() - start).toFixed(0)}ms`)

    return built
  } catch (error) {
    console.warn(`[load] ${path} failed`, error)

    return null
  }
}

const loadAllExtras = async (): Promise<BuiltExtras | null> => {
  try {
    const start = performance.now()
    const built = constructExtras(await loadExtras())

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
  const total = levelPaths.length + 1
  const [levels, setLevels] = useState<Built[] | null>(null)
  const [extras, setExtras] = useState<BuiltExtras | null>(null)
  const [progress, setProgress] = useState<LoadProgress>({ loaded: 0, total })

  useEffect(() => {
    let isCancelled = false
    let loaded = 0

    const bump = () => {
      loaded++

      if (!isCancelled) {
        setProgress({ loaded, total })
      }
    }

    const extrasPromise = loadAllExtras().finally(bump)

    const levelsPromise = Promise.all(
      levelPaths.map((path) => loadOneLevel(path).finally(bump)),
    )

    Promise.all([extrasPromise, levelsPromise])
      .then(([extrasBuilt, levelResults]) => {
        if (isCancelled) {
          return
        }

        const loadedLevels = levelResults.filter((entry): entry is Built => entry !== null)

        if (loadedLevels.length === 0) {
          console.error('[load] no levels loaded')

          return
        }

        setLevels(loadedLevels)
        setExtras(extrasBuilt)
      })
      .catch((error) => console.error('[load] failed', error))

    return () => {
      isCancelled = true
    }
  }, [levelPaths, total])

  return { extras, levels, progress }
}
