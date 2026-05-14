import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector3 } from 'three'

import type { TrackSpline } from '../../../constructor/trackSpline'
import type { Ship } from '../Ships/ship'

import { audioState } from '../../../audio'
import {
  CAMERA_BACK_OFFSET,
  CAMERA_DROP_SHAKE_DURATION_SEC,
  CAMERA_DROP_SHAKE_FREQ_HZ,
  CAMERA_DROP_SHAKE_MAGNITUDE,
  CAMERA_DROP_STRENGTH_THRESHOLD,
  CAMERA_TANGENT_LAG,
  CAMERA_UP_OFFSET,
  TWO_PI,
} from '../../../constants'

type ChaseCameraProps = {
  ships: Ship[]
  splines: TrackSpline[]
}

const _shipPos = new Vector3()
const _tangent = new Vector3()
const _right = new Vector3()
const WORLD_UP = new Vector3(0, 1, 0)

const ChaseCamera = ({ ships, splines }: ChaseCameraProps) => {
  const { camera, clock } = useThree()
  const lastSectionChangeRef = useRef(audioState.sectionChangeCount)
  const shakeRemainingRef = useRef(0)
  const shakeStrengthRef = useRef(0)

  useFrame((_, dt) => {
    const ship = ships.find((candidate) => candidate.isCameraTarget)

    if (!ship) {
      return
    }

    const group = ship.groupRef.current

    if (!group) {
      return
    }

    group.getWorldPosition(_shipPos)

    const spline = splines[ship.pose.splineIndex] ?? splines[0]
    const tangentT = (((ship.pose.lapProgress - CAMERA_TANGENT_LAG) % 1) + 1) % 1
    spline.curve.getTangentAt(tangentT, _tangent).normalize()

    camera.position.copy(_shipPos).addScaledVector(_tangent, -CAMERA_BACK_OFFSET)
    camera.position.y += CAMERA_UP_OFFSET

    if (
      audioState.sectionChangeCount !== lastSectionChangeRef.current &&
      audioState.sectionStrength >= CAMERA_DROP_STRENGTH_THRESHOLD
    ) {
      shakeRemainingRef.current = CAMERA_DROP_SHAKE_DURATION_SEC
      shakeStrengthRef.current = audioState.sectionStrength
    }

    lastSectionChangeRef.current = audioState.sectionChangeCount

    if (shakeRemainingRef.current > 0) {
      const envelope = (shakeRemainingRef.current / CAMERA_DROP_SHAKE_DURATION_SEC) * shakeStrengthRef.current
      const magnitude = envelope * CAMERA_DROP_SHAKE_MAGNITUDE

      _right.crossVectors(_tangent, WORLD_UP).normalize()
      const time = clock.getElapsedTime()
      const lateral = Math.sin(time * CAMERA_DROP_SHAKE_FREQ_HZ * TWO_PI) * magnitude
      const vertical = Math.cos(time * CAMERA_DROP_SHAKE_FREQ_HZ * TWO_PI * 0.87) * magnitude

      camera.position.addScaledVector(_right, lateral)
      camera.position.y += vertical

      shakeRemainingRef.current = Math.max(0, shakeRemainingRef.current - dt)
    }

    camera.lookAt(_shipPos)
  })

  return null
}

export default ChaseCamera
