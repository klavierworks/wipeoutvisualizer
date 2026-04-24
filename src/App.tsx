import { useEffect, useMemo, useState } from 'react'
import type { Group } from 'three'
import './App.css'
import { construct, constructExtras, type Built, type BuiltExtras } from './constructor'
import { loadExtras, loadTrack } from './reader-bridge'
import { World } from './gl/World'

const LEVEL_PATHS = [
  'WIPEOUT2/TRACK01',
  'WIPEOUT2/TRACK02',
  'WIPEOUT2/TRACK04',
  'WIPEOUT2/TRACK06',
  'WIPEOUT2/TRACK07',
  'WIPEOUT2/TRACK08',
]

const TOTAL_LOAD_STEPS = LEVEL_PATHS.length + 1

type LoadProgress = { loaded: number; total: number }

function App() {
  const [levels, setLevels] = useState<Built[] | null>(null)
  const [extras, setExtras] = useState<BuiltExtras | null>(null)
  const [progress, setProgress] = useState<LoadProgress>({ loaded: 0, total: TOTAL_LOAD_STEPS })
  const [leaderMeshKey, setLeaderMeshKey] = useState<string | null>(null)

  const leaderMeshOverride = useMemo<Group | null>(
    () => (leaderMeshKey && extras ? (extras.meshes[leaderMeshKey] ?? null) : null),
    [leaderMeshKey, extras],
  )

  useEffect(() => {
    window.setMesh = (key) => {
      if (!key) {
        setLeaderMeshKey(null)
        console.log('[setMesh] cleared — leader reverts to default ship')
        return
      }
      if (extras && !extras.meshes[key]) {
        console.warn(
          `[setMesh] unknown key "${key}". Available:`,
          Object.keys(extras.meshes),
        )
        return
      }
      setLeaderMeshKey(key)
      console.log(`[setMesh] leader → ${key}`)
    }
  }, [extras])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let loaded = 0
      const bump = () => {
        loaded++
        if (!cancelled) setProgress({ loaded, total: TOTAL_LOAD_STEPS })
      }

      const extrasPromise = (async () => {
        const t0 = performance.now()
        const built = constructExtras(await loadExtras())
        console.log(
          `[load] extras (${Object.keys(built.meshes).length} meshes, ${Object.keys(built.atlases).length} atlases) in ${(performance.now() - t0).toFixed(0)}ms`,
        )
        console.log(built)
        return built
      })()
        .catch((e) => {
          console.warn('[load] extras failed', e)
          return null
        })
        .finally(bump)

      const levelResults = await Promise.all(
        LEVEL_PATHS.map(async (path) => {
          try {
            const t0 = performance.now()
            const data = await loadTrack(path)
            const built = construct(data)
            console.log(`[load] ${path} in ${(performance.now() - t0).toFixed(0)}ms`)
            return built
          } catch (error) {
            console.warn(`[load] ${path} failed`, error)
            return null
          } finally {
            bump()
          }
        }),
      )
      const extrasBuilt = await extrasPromise

      if (cancelled) return
      const ok = levelResults.filter((x): x is Built => x !== null)
      if (ok.length === 0) {
        console.error('[load] no levels loaded')
        return
      }
      setLevels(ok)
      setExtras(extrasBuilt)
    })().catch((e) => console.error('[load] failed', e))
    return () => {
      cancelled = true
    }
  }, [])

  if (!levels) {
    return (
      <div className="loading">
        Loading tracks… {progress.loaded}/{progress.total}
      </div>
    )
  }

  return <World levels={levels} extras={extras} leaderMeshOverride={leaderMeshOverride} />
}

export default App
