import { useFrame } from '@react-three/fiber'

import type { RacerMotion } from '../racerUtils'

import { COLLISION_LANE_IMPULSE, COLLISION_RADIUS } from '../../../../constants'

type ShipCollisionsProps = {
  motions: RacerMotion[]
}

const RADIUS_SQ = (COLLISION_RADIUS * 2) ** 2

// Naive O(N²) sphere-vs-sphere broadphase across racers. On overlap we add a
// lateral lane impulse to each racer's collisionLaneOffset so the spline
// sample on the next frame nudges them apart, then the existing wall clamp
// keeps them inbounds. Modeled on phoboslab/wipeout-rewrite ship.c:990-1014
// but adapted for our spline-bound racers — we don't free-fly velocities.
//
// Higher useFrame priority than the Racer default so we run after every
// racer has finalized its motion.position for this frame.
const ShipCollisions = ({ motions }: ShipCollisionsProps) => {
  useFrame(() => {
    for (let i = 0; i < motions.length; i++) {
      const a = motions[i]
      for (let j = i + 1; j < motions.length; j++) {
        const b = motions[j]
        const dx = a.position.x - b.position.x
        const dy = a.position.y - b.position.y
        const dz = a.position.z - b.position.z
        const distSq = dx * dx + dy * dy + dz * dz
        if (distSq >= RADIUS_SQ || distSq < 1e-6) continue
        // Sign of separation along world-X is a coarse proxy for which
        // racer is on the "outside" lane. Our lanes are axis-agnostic on
        // the spline (they ride basisX, which rotates with the track), so
        // perfect sign tracking would require sampling the spline; this
        // approximation is close enough at typical track curvatures.
        const sign = dx >= 0 ? 1 : -1
        a.collisionLaneOffset += sign * COLLISION_LANE_IMPULSE
        b.collisionLaneOffset -= sign * COLLISION_LANE_IMPULSE
      }
    }
  }, 1)

  return null
}

export default ShipCollisions
