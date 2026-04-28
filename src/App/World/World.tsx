import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useCallback, useMemo, useState } from 'react'
import { Group } from 'three'

import type { BuiltExtras } from '../../constructor'
import type { LoadedLevel } from '../useLevelLoader'

import { LEVEL_ADVANCE_STRENGTH, RACER_COUNT, SHIP_NAMES, TRACK_NAMES } from '../../constants'
import AudioProvider from './AudioProvider/AudioProvider'
import AudioTicker from './AudioTicker/AudioTicker'
import Billboards from './Billboards/Billboards'
import ChaseCamera from './ChaseCamera/ChaseCamera'
import Hud from './Hud/Hud'
import LevelSwapper from './LevelSwapper/LevelSwapper'
import ReactivityTicker from './ReactivityTicker/ReactivityTicker'
import Scene from './Scene/Scene'
import SectionLabels from './SectionLabels/SectionLabels'
import Ships from './Ships/Ships'
import { useRacerTemplates } from './Ships/useRacerTemplates'
import useShipFleet from './Ships/useShipFleet'
import Sky from './SkyboxLayer/Sky/Sky'
import SkyboxLayer from './SkyboxLayer/SkyboxLayer'
import SplineDebug from './SplineDebug/SplineDebug'
import StartGantry from './StartGantry/StartGantry'
import Track from './Track/Track'

type WorldProps = {
  extras: BuiltExtras | null
  isDebug: boolean
  isPinned: boolean
  leaderMeshOverride: Group | null
  levels: LoadedLevel[]
  shipIndex: null | number
}

const findExtrasMeshKey = (leader: Group, extrasMeshes: Record<string, Group> | undefined): null | string => {
  if (!extrasMeshes) {
    return null
  }

  for (const [key, mesh] of Object.entries(extrasMeshes)) {
    if (mesh === leader) {
      return key
    }
  }

  return null
}

const resolveLeaderName = (leader: Group, shipPool: Group[], extras: BuiltExtras | null): string => {
  const extrasKey = findExtrasMeshKey(leader, extras?.meshes)

  if (extrasKey !== null) {
    return extrasKey
  }

  const index = shipPool.indexOf(leader)

  if (index >= 0 && SHIP_NAMES[index]) {
    return SHIP_NAMES[index]
  }

  return index >= 0 ? `Ship ${index}` : 'Ship'
}

const resolveTrackName = (path: string): string => TRACK_NAMES[path] ?? path

const pickDifferent = (length: number, exclude: number): number => {
  if (length <= 1) {
    return 0
  }

  let pick = Math.floor(Math.random() * (length - 1))

  if (pick >= exclude) {
    pick++
  }

  return pick
}

const World = ({ extras, isDebug, isPinned, leaderMeshOverride, levels, shipIndex }: WorldProps) => {
  const [indexes, setIndexes] = useState(() => {
    const current = Math.floor(Math.random() * levels.length)

    return { current, next: pickDifferent(levels.length, current) }
  })

  const current = levels[indexes.current].built
  const next = levels[indexes.next].built
  const currentPath = levels[indexes.current].path

  const templates = useRacerTemplates(current.ships.meshes, leaderMeshOverride, shipIndex, RACER_COUNT)
  const { ships } = useShipFleet(current.ships.splines)

  const leaderName = useMemo(
    () => resolveLeaderName(templates[0], current.ships.meshes, extras),
    [templates, current.ships.meshes, extras],
  )
  const trackName = useMemo(() => resolveTrackName(currentPath), [currentPath])

  const handleSection = useCallback(
    (strength: number) => {
      if (isPinned) {
        return
      }

      if (strength < LEVEL_ADVANCE_STRENGTH) {
        console.log(`[level] section change strength ${strength.toFixed(2)} → no swap`)
        return
      }

      console.log(`[level] section change strength ${strength.toFixed(2)} → advance level`)

      setIndexes((prev) => ({ current: prev.next, next: pickDifferent(levels.length, prev.next) }))
    },
    [levels.length, isPinned],
  )

  return (
    <AudioProvider>
      {({ pipeline }) => (
        <>
          <Canvas camera={{ far: 1000000, near: 0.1 }} gl={{ logarithmicDepthBuffer: true }}>
            {pipeline && <AudioTicker pipeline={pipeline} />}
            <ReactivityTicker />
            <LevelSwapper onSection={handleSection} />
            <Billboards />
            <SkyboxLayer>
              <Sky
                key={`sky-current-${indexes.current}`}
                object={current.sky}
                offlineSections={pipeline?.offlineSections ?? null}
                role="current"
              />
              <Sky
                key={`sky-next-${indexes.next}`}
                object={next.sky}
                offlineSections={pipeline?.offlineSections ?? null}
                role="next"
              />
            </SkyboxLayer>
            <Scene bundle={current.scene} />
            <StartGantry spline={current.ships.splines[0]} template={extras?.meshes.lights} />
            <Track ships={ships} splines={current.ships.splines} track={current.track} />
            {isDebug && <SplineDebug splines={current.ships.splines} />}
            {isDebug && <SectionLabels spline={current.ships.splines[0]} />}
            <Ships ships={ships} splines={current.ships.splines} templates={templates} />
            {isDebug ? (
              <OrbitControls makeDefault />
            ) : (
              <ChaseCamera ships={ships} splines={current.ships.splines} />
            )}
          </Canvas>
          {pipeline && (
            <Hud
              leaderName={leaderName}
              offlineSections={pipeline.offlineSections}
              trackName={trackName}
            />
          )}
        </>
      )}
    </AudioProvider>
  )
}

export default World
