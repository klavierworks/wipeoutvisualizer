import type { Group } from 'three'

import { useEffect, useMemo, useState } from 'react'

import './App.css'
import Loading from './Loading/Loading'
import { resolveLevelPaths } from './resolveLevelPaths'
import { resolveShipIndex } from './resolveShipIndex'
import { useLevelLoader } from './useLevelLoader'
import World from './World/World'

const readDebugFlag = (): boolean => new URLSearchParams(window.location.search).get('isDebug') === 'true'

const App = () => {
  const { isPinned, paths: levelPaths } = useMemo(resolveLevelPaths, [])
  const isDebug = useMemo(readDebugFlag, [])
  const shipIndex = useMemo(resolveShipIndex, [])

  const { extras, levels, progress } = useLevelLoader(levelPaths)

  const [leaderMeshKey, setLeaderMeshKey] = useState<null | string>(null)

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
        console.warn(`[setMesh] unknown key "${key}". Available:`, Object.keys(extras.meshes))

        return
      }

      setLeaderMeshKey(key)
      console.log(`[setMesh] leader → ${key}`)
    }
  }, [extras])

  if (!levels) {
    return <Loading loaded={progress.loaded} total={progress.total} />
  }

  return (
    <World
      extras={extras}
      isDebug={isDebug}
      isPinned={isPinned}
      leaderMeshOverride={leaderMeshOverride}
      levels={levels}
      shipIndex={shipIndex}
    />
  )
}

export default App
