import { useFrame, useThree } from '@react-three/fiber'
import { MutableRefObject, RefObject } from 'react'
import { Group, Vector3 } from 'three'
import type { TrackSpline } from '../../constructor/trackSpline'

type Props = {
  target: RefObject<Group | null>
  spline: TrackSpline
  leaderT: MutableRefObject<number>
}

const BACK = 500
const UP = 100
const TANGENT_LAG = 0.006

const _shipPos = new Vector3()
const _tangent = new Vector3()

export const ChaseCamera = ({ target, spline, leaderT }: Props) => {
  const { camera } = useThree()

  useFrame(() => {
    const ship = target.current
    if (!ship) return

    ship.getWorldPosition(_shipPos)

    const tangentT = (((leaderT.current - TANGENT_LAG) % 1) + 1) % 1
    spline.curve.getTangentAt(tangentT, _tangent).normalize()

    camera.position.copy(_shipPos).addScaledVector(_tangent, -BACK)
    camera.position.y += UP
    camera.lookAt(_shipPos)
  })

  return null
}
