import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

import type { TrackSpline } from '../../../constructor/trackSpline'
import type { Ship } from '../Ships/ship'

import { CAMERA_BACK_OFFSET, CAMERA_TANGENT_LAG, CAMERA_UP_OFFSET } from '../../../constants'

type ChaseCameraProps = {
  ships: Ship[]
  splines: TrackSpline[]
}

const _shipPos = new Vector3()
const _tangent = new Vector3()

const ChaseCamera = ({ ships, splines }: ChaseCameraProps) => {
  const { camera } = useThree()

  useFrame(() => {
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
    camera.lookAt(_shipPos)
  })

  return null
}

export default ChaseCamera
