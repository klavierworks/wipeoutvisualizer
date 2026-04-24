import { Canvas } from '@react-three/fiber'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Group } from 'three'
import { AudioProvider, AudioTicker } from '../audio'
import type { Built, BuiltExtras } from '../constructor'
import { LevelSwapper } from './LevelSwapper'
import { Scene } from './Scene'
import { RACER_COUNT, Ships } from './Ships'
import { Sky } from './Sky'
import { SkyboxLayer } from './SkyboxLayer'
import { Track } from './Track'
import { Billboards } from './utils/Billboards'
import { ChaseCamera } from './utils/ChaseCamera'
import HUD from './HUD/HUD'

type Props = {
  levels: Built[]
  extras: BuiltExtras | null
  leaderMeshOverride: Group | null
}

const GL_CONFIG = { logarithmicDepthBuffer: true }
// far was 100_000, which clips the sky's far hemisphere — sky geometry at
// scale 30 extends ~90k units from its origin, so the backside sat past the
// old clip plane. logarithmicDepthBuffer keeps precision sane at this range.
const CAMERA_CONFIG = { near: 0.1, far: 1_000_000 }

// Picks a random level index in [0, length) that isn't `exclude`, so
// consecutive sections never land on the same level (which would make the
// ship warp a visual no-op).
const pickDifferent = (length: number, exclude: number): number => {
  if (length <= 1) return 0
  let pick = Math.floor(Math.random() * (length - 1))
  if (pick >= exclude) pick++
  return pick
}

export const World = ({ levels, extras, leaderMeshOverride }: Props) => {
  const leaderRef = useRef<Group | null>(null)
  const leaderTRef = useRef<number>(0)
  const racerTsRef = useRef<Float32Array>(new Float32Array(RACER_COUNT))
  const glConfig = useMemo(() => GL_CONFIG, [])
  const cameraConfig = useMemo(() => CAMERA_CONFIG, [])

  // nextIdx is committed at section start so the next level's sky can begin
  // fading in during the last 5s of the current section. On section boundary
  // the "next" becomes the new "current" and a fresh nextIdx is picked.
  // Bundled into one state so the initial random pair is coordinated (cur vs
  // next are always distinct) and advancement is atomic.
  const [idxs, setIdxs] = useState(() => {
    const cur = Math.floor(Math.random() * levels.length)
    return { cur, next: pickDifferent(levels.length, cur) }
  })
  const current = levels[idxs.cur]
  const next = levels[idxs.next]

  const handleSection = useCallback(
    (sectionIdx: number, strength: number) => {
      console.log(
        `[level] section ${sectionIdx} strength ${strength.toFixed(2)} → advance level`,
      )
      setIdxs((prev) => ({ cur: prev.next, next: pickDifferent(levels.length, prev.next) }))
    },
    [levels.length],
  )

  return (
    <AudioProvider src="/sample.mp3">
      {({ engine, analysis }) => (
        <>
          <Canvas gl={glConfig} camera={cameraConfig}>
            <AudioTicker engine={engine} analysis={analysis} />
            <LevelSwapper sections={analysis.sections} onSection={handleSection} />
            <Billboards />
            <SkyboxLayer>
              <Sky key={`sky-cur-${idxs.cur}`} object={current.sky} role="current" />
              <Sky key={`sky-next-${idxs.next}`} object={next.sky} role="next" />
            </SkyboxLayer>
            <Scene object={current.scene} />
            <Track track={current.track} racerTsRef={racerTsRef} />
            <Ships
              ships={current.ships}
              leaderRef={leaderRef}
              leaderTRef={leaderTRef}
              racerTsRef={racerTsRef}
              leaderMeshOverride={leaderMeshOverride}
            />
            <ChaseCamera target={leaderRef} spline={current.ships.spline} leaderT={leaderTRef} />
          </Canvas>
          <HUD extras={extras} />
        </>
      )}
    </AudioProvider>
  )
}
