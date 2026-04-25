import { MutableRefObject, useMemo, useRef } from 'react'
import { Group } from 'three'

import type { Built } from '../../../constructor'

import { RACER_COUNT } from '../../../constants'
import Racer from './Racer/Racer'
import { makeRacerConfig, type RacerConfig } from './racerConfig'
import { type LeaderOutputs, type RacerOutputs } from './racerUtils'
import { useRacerTemplates } from './useRacerTemplates'

type ShipsProps = {
  leaderMeshOverride?: Group | null
  leaderRef?: MutableRefObject<Group | null>
  leaderSplineIndexRef?: MutableRefObject<number>
  leaderTRef?: MutableRefObject<number>
  racerLanesRef?: MutableRefObject<Float32Array>
  racerSplineIndexesRef?: MutableRefObject<Int32Array>
  racerTsRef?: MutableRefObject<Float32Array>
  ships: Built['ships']
}

const Ships = ({
  leaderMeshOverride,
  leaderRef,
  leaderSplineIndexRef,
  leaderTRef,
  racerLanesRef,
  racerSplineIndexesRef,
  racerTsRef,
  ships,
}: ShipsProps) => {
  const configsRef = useRef<RacerConfig[]>(
    Array.from({ length: RACER_COUNT }, (_, i) => makeRacerConfig(i, RACER_COUNT, ships.splines.length))
  );

  const templates = useRacerTemplates(ships.meshes, leaderMeshOverride, RACER_COUNT)

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
          racerOutputs={racerOutputs}
          splines={ships.splines}
          template={templates[i]}
        />
      ))}
    </>
  )
}

export default Ships
