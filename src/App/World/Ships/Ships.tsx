import { MutableRefObject, useMemo, useRef } from 'react'
import { Group } from 'three'

import type { TrackSpline } from '../../../constructor/trackSpline'

import { RACER_COUNT } from '../../../constants'
import Racer from './Racer/Racer'
import { makeRacerConfig, type RacerConfig } from './racerConfig'
import { type LeaderOutputs, makeRacerMotion, type RacerMotion, type RacerOutputs } from './racerUtils'
import ShipCollisions from './ShipCollisions/ShipCollisions'

type ShipsProps = {
  leaderRef?: MutableRefObject<Group | null>
  leaderSplineIndexRef?: MutableRefObject<number>
  leaderTRef?: MutableRefObject<number>
  racerLanesRef?: MutableRefObject<Float32Array>
  racerSplineIndexesRef?: MutableRefObject<Int32Array>
  racerTsRef?: MutableRefObject<Float32Array>
  splines: TrackSpline[]
  templates: Group[]
}

const Ships = ({
  leaderRef,
  leaderSplineIndexRef,
  leaderTRef,
  racerLanesRef,
  racerSplineIndexesRef,
  racerTsRef,
  splines,
  templates,
}: ShipsProps) => {
  const configsRef = useRef<RacerConfig[]>(
    Array.from({ length: RACER_COUNT }, (_, i) =>
      makeRacerConfig(
        i,
        RACER_COUNT,
        splines.length,
        splines[0].startLineT,
        splines[0].numSections,
      ),
    ),
  );

  // Motions live here (not inside Racer) so ShipCollisions can do pairwise
  // lateral nudges across the whole field each frame.
  const motionsRef = useRef<RacerMotion[]>(
    configsRef.current.map((config) => makeRacerMotion(config))
  );

  const leaderOutputs = useMemo<LeaderOutputs | undefined>(() => {
    if (!leaderRef || !leaderTRef || !leaderSplineIndexRef) {
      return undefined
    }

    return { groupRef: leaderRef, splineIndexRef: leaderSplineIndexRef, tRef: leaderTRef }
  }, [leaderRef, leaderTRef, leaderSplineIndexRef])

  const racerOutputs = useMemo<RacerOutputs | undefined>(() => {
    if (!racerTsRef || !racerLanesRef || !racerSplineIndexesRef) {
      return undefined
    }

    return { lanes: racerLanesRef, splineIndexes: racerSplineIndexesRef, ts: racerTsRef }
  }, [racerTsRef, racerLanesRef, racerSplineIndexesRef])

  return (
    <>
      {configsRef.current.map((config, i) => (
        <Racer
          config={config}
          index={i}
          key={i}
          leaderOutputs={i === 0 ? leaderOutputs : undefined}
          motion={motionsRef.current[i]}
          motions={motionsRef.current}
          racerOutputs={racerOutputs}
          splines={splines}
          template={templates[i]}
        />
      ))}
      <ShipCollisions motions={motionsRef.current} />
    </>
  )
}

export default Ships
