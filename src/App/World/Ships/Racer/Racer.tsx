import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Group } from 'three'

import type { TrackSpline } from '../../../../constructor/trackSpline'
import type { RacerConfig } from '../racerConfig'
import type { LeaderOutputs, RacerMotion, RacerOutputs } from '../racerUtils'

import { pickSplineIndex } from '../racerConfig'
import {
  advanceAlongSpline,
  buildBasisMatrix,
  clampToTrack,
  computeOrientationTangent,
  samplePath,
  seedMotion,
  updateBoostState,
  updateFlight,
  updatePitch,
  updateRoll,
  updateSplineVelocity,
  updateWallStress,
  writeOrientation,
  writeOutputs,
} from '../racerUtils'
import Ship from './Ship/Ship'

type RacerProps = {
  config: RacerConfig
  index: number
  leaderOutputs?: LeaderOutputs
  motion: RacerMotion
  racerOutputs?: RacerOutputs
  splines: TrackSpline[]
  template: Group
}

const Racer = ({ config, index, leaderOutputs, motion, racerOutputs, splines, template }: RacerProps) => {
  const motionRef = useRef(motion)
  const isBoostingRef = useRef(false)
  const groupRef = useRef<Group | null>(null)

  useEffect(() => {
    const motion = motionRef.current

    motion.isSeeded = false
    motion.splineIndex = pickSplineIndex(splines.length)
  }, [splines])

  useFrame((_, dt) => {
    const motion = motionRef.current
    const group = groupRef.current

    if (!group) {
      return
    }

    updateBoostState(motion, splines[motion.splineIndex], config, dt)
    isBoostingRef.current = motion.boostTimer > 0

    advanceAlongSpline(motion, config, splines.length, dt)

    const spline = splines[motion.splineIndex]
    const sample = samplePath(spline, motion, config)

    writeOutputs(motion, sample, index, leaderOutputs, racerOutputs)

    if (!motion.isSeeded) {
      seedMotion(motion, sample)
    }

    updateWallStress(motion, sample, dt)
    updateSplineVelocity(motion, sample, dt)
    updateFlight(motion, sample, dt)
    clampToTrack(motion, sample)

    group.position.copy(motion.position)

    const orientation = computeOrientationTangent(motion, sample)
    const matrix = buildBasisMatrix(orientation, sample)

    updatePitch(motion, sample, dt)
    updateRoll(motion, spline, sample, dt)
    writeOrientation(motion, matrix, sample, orientation, group)
  })

  return (
    <group
      ref={(node) => {
        groupRef.current = node

        if (leaderOutputs) {
          leaderOutputs.groupRef.current = node
        }
      }}
      scale={0.5}
    >
      <Ship isBoostingRef={isBoostingRef} template={template} />
    </group>
  )
}

export default Racer
