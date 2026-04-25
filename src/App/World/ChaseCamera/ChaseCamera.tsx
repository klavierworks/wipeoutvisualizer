import { useFrame, useThree } from '@react-three/fiber'
import { MutableRefObject, RefObject } from 'react'
import { Group, Vector3 } from 'three'

import type { TrackSpline } from '../../../constructor/trackSpline'

import { CAMERA_BACK_OFFSET, CAMERA_TANGENT_LAG, CAMERA_UP_OFFSET } from '../../../constants'

type ChaseCameraProps = {
  leaderSplineIndex: MutableRefObject<number>
  leaderT: MutableRefObject<number>
  splines: TrackSpline[]
  target: RefObject<Group | null>
}

const _shipPos = new Vector3()
const _tangent = new Vector3()

const ChaseCamera = ({ leaderSplineIndex, leaderT, splines, target }: ChaseCameraProps) => {
  const { camera } = useThree()

  useFrame(() => {
    const ship = target.current

    if (!ship) {
      return
    }

    ship.getWorldPosition(_shipPos)

    const spline = splines[leaderSplineIndex.current] ?? splines[0]
    const tangentT = (((leaderT.current - CAMERA_TANGENT_LAG) % 1) + 1) % 1
    spline.curve.getTangentAt(tangentT, _tangent).normalize()

    camera.position.copy(_shipPos).addScaledVector(_tangent, -CAMERA_BACK_OFFSET)
    camera.position.y += CAMERA_UP_OFFSET
    camera.lookAt(_shipPos)
  })

  return null
}

export default ChaseCamera
