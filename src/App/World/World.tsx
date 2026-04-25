import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useCallback, useRef, useState } from 'react'
import { Group } from 'three'

import type { Built, BuiltExtras } from '../../constructor'

import { LEVEL_ADVANCE_STRENGTH, RACER_COUNT } from '../../constants'
import AudioProvider from './AudioProvider/AudioProvider'
import AudioTicker from './AudioTicker/AudioTicker'
import Billboards from './Billboards/Billboards'
import ChaseCamera from './ChaseCamera/ChaseCamera'
import Hud from './Hud/Hud'
import LevelSwapper from './LevelSwapper/LevelSwapper'
import Scene from './Scene/Scene'
import Ships from './Ships/Ships'
import Sky from './SkyboxLayer/Sky/Sky'
import SkyboxLayer from './SkyboxLayer/SkyboxLayer'
import SplineDebug from './SplineDebug/SplineDebug'
import Track from './Track/Track'

type WorldProps = {
  extras: BuiltExtras | null
  isDebug: boolean
  isPinned: boolean
  leaderMeshOverride: Group | null
  levels: Built[]
}

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

const World = ({ extras, isDebug, isPinned, leaderMeshOverride, levels }: WorldProps) => {
  const leaderRef = useRef<Group | null>(null)
  const leaderTRef = useRef<number>(0)
  const leaderSplineIndexRef = useRef<number>(0)
  const racerTsRef = useRef<Float32Array>(new Float32Array(RACER_COUNT))
  const racerLanesRef = useRef<Float32Array>(new Float32Array(RACER_COUNT))
  const racerSplineIndexesRef = useRef<Int32Array>(new Int32Array(RACER_COUNT))

  const [indexes, setIndexes] = useState(() => {
    const current = Math.floor(Math.random() * levels.length)

    return { current, next: pickDifferent(levels.length, current) }
  })

  const current = levels[indexes.current]
  const next = levels[indexes.next]

  const handleSection = useCallback(
    (sectionIndex: number, strength: number) => {
      if (isPinned) {
        return
      }

      if (strength < LEVEL_ADVANCE_STRENGTH) {
        console.log(`[level] section ${sectionIndex} strength ${strength.toFixed(2)} → no swap`)
        return
      }

      console.log(`[level] section ${sectionIndex} strength ${strength.toFixed(2)} → advance level`)

      setIndexes((prev) => ({ current: prev.next, next: pickDifferent(levels.length, prev.next) }))
    },
    [levels.length, isPinned],
  )

  return (
    <AudioProvider src="/sample.mp3">
      {({ analysis, engine }) => (
        <>
          <Canvas camera={{ far: 1000000, near: 0.1 }} gl={{ logarithmicDepthBuffer: true }}>
            <AudioTicker analysis={analysis} engine={engine} />
            <LevelSwapper onSection={handleSection} sections={analysis.sections} />
            <Billboards />
            <SkyboxLayer>
              <Sky key={`sky-current-${indexes.current}`} object={current.sky} role="current" />
              <Sky key={`sky-next-${indexes.next}`} object={next.sky} role="next" />
            </SkyboxLayer>
            <Scene bundle={current.scene} />
            <Track
              racerLanesRef={racerLanesRef}
              racerSplineIndexesRef={racerSplineIndexesRef}
              racerTsRef={racerTsRef}
              splines={current.ships.splines}
              track={current.track}
            />
            {isDebug && <SplineDebug splines={current.ships.splines} />}
            <Ships
              leaderMeshOverride={leaderMeshOverride}
              leaderRef={leaderRef}
              leaderSplineIndexRef={leaderSplineIndexRef}
              leaderTRef={leaderTRef}
              racerLanesRef={racerLanesRef}
              racerSplineIndexesRef={racerSplineIndexesRef}
              racerTsRef={racerTsRef}
              ships={current.ships}
            />
            {isDebug ? (
              <OrbitControls makeDefault />
            ) : (
              <ChaseCamera
                leaderSplineIndex={leaderSplineIndexRef}
                leaderT={leaderTRef}
                splines={current.ships.splines}
                target={leaderRef}
              />
            )}
          </Canvas>
          <Hud extras={extras} />
        </>
      )}
    </AudioProvider>
  )
}

export default World
