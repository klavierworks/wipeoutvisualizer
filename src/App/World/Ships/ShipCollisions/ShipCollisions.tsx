import { useFrame } from '@react-three/fiber'

import type { Ship } from '../ship'

import { COLLISION_LANE_IMPULSE, COLLISION_RADIUS } from '../../../../constants'

type ShipCollisionsProps = {
  ships: Ship[]
}

const RADIUS_SQ = (COLLISION_RADIUS * 2) ** 2

// Naive O(N²) sphere-vs-sphere broadphase across ships. On overlap we add a
// lateral lane impulse to each ship's collisionLaneOffset so the spline
// sample on the next frame nudges them apart, then the existing wall clamp
// keeps them inbounds. Modeled on phoboslab/wipeout-rewrite ship.c:990-1014
// but adapted for our spline-bound ships — we don't free-fly velocities.
//
// Higher useFrame priority than the Ships default so we run after every
// ship has finalized its position for this frame.
const ShipCollisions = ({ ships }: ShipCollisionsProps) => {
  useFrame(() => {
    for (let i = 0; i < ships.length; i++) {
      const a = ships[i]
      for (let j = i + 1; j < ships.length; j++) {
        const b = ships[j]
        const dx = a.pose.position.x - b.pose.position.x
        const dy = a.pose.position.y - b.pose.position.y
        const dz = a.pose.position.z - b.pose.position.z
        const distSq = dx * dx + dy * dy + dz * dz
        if (distSq >= RADIUS_SQ || distSq < 1e-6) {
          continue
        }
        // Sign of separation along world-X is a coarse proxy for which ship
        // is on the "outside" lane. Our lanes are axis-agnostic on the
        // spline (they ride basisX, which rotates with the track), so
        // perfect sign tracking would require sampling the spline; this
        // approximation is close enough at typical track curvatures.
        const sign = dx >= 0 ? 1 : -1
        a.lane.collisionOffset += sign * COLLISION_LANE_IMPULSE
        b.lane.collisionOffset -= sign * COLLISION_LANE_IMPULSE
      }
    }
  }, 1)

  return null
}

export default ShipCollisions
