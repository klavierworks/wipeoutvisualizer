import type { BufferAttribute, Mesh } from 'three'

import { useFrame } from '@react-three/fiber'
import { MutableRefObject, useRef } from 'react'

import type { Ship } from '../App/World/Ships/ship'
import type { BoostSection } from '../constructor/track'
import type { TrackSpline } from '../constructor/trackSpline'

import { audioState } from '../audio'
import { BOOST_FALLOFF, BOOST_KICK_THRESHOLD, HOT_COLOR } from '../constants'

const seedPulsesFromShips = (
  pulses: Float32Array,
  lastBoostByShipRef: MutableRefObject<Int32Array>,
  splines: TrackSpline[],
  ships: Ship[],
): void => {
  if (lastBoostByShipRef.current.length !== ships.length) {
    lastBoostByShipRef.current = new Int32Array(ships.length).fill(-1)
  }

  const lastBoostByShip = lastBoostByShipRef.current

  for (let shipIndex = 0; shipIndex < ships.length; shipIndex++) {
    const ship = ships[shipIndex]
    const spline = splines[ship.pose.splineIndex]
    const sectionIndex = spline ? spline.boostPulseAt(ship.pose.lapProgress, ship.lane.current) : -1

    if (sectionIndex >= 0 && sectionIndex !== lastBoostByShip[shipIndex]) {
      pulses[sectionIndex] = 1
    }

    lastBoostByShip[shipIndex] = sectionIndex
  }
}

const writeBoostColors = (
  colors: Float32Array,
  sections: BoostSection[],
  pulses: Float32Array,
  baseColor: [number, number, number],
  kickPulse: number,
  dt: number,
): void => {
  const decay = dt * BOOST_FALLOFF

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    pulses[sectionIndex] = Math.max(0, pulses[sectionIndex] - decay)

    const lift = Math.max(pulses[sectionIndex], kickPulse)
    const r = baseColor[0] + (HOT_COLOR[0] - baseColor[0]) * lift
    const g = baseColor[1] + (HOT_COLOR[1] - baseColor[1]) * lift
    const b = baseColor[2] + (HOT_COLOR[2] - baseColor[2]) * lift
    const indices = sections[sectionIndex].indices

    for (let i = 0; i < indices.length; i++) {
      const vertexOffset = indices[i] * 3

      colors[vertexOffset] = r
      colors[vertexOffset + 1] = g
      colors[vertexOffset + 2] = b
    }
  }
}

const useBoostTilesReactivity = (
  mesh: Mesh,
  sections: BoostSection[],
  splines: TrackSpline[],
  baseColor: [number, number, number],
  ships: Ship[],
) => {
  const pulsesRef = useRef<Float32Array>(new Float32Array(sections.length))
  const lastBoostByShipRef = useRef<Int32Array>(new Int32Array(0))
  const kickPulseRef = useRef(0)
  const wasKickAboveRef = useRef(false)

  useFrame((_, dt) => {
    if (sections.length === 0) {
      return
    }

    seedPulsesFromShips(pulsesRef.current, lastBoostByShipRef, splines, ships)

    const isKickAbove = audioState.kick > BOOST_KICK_THRESHOLD

    if (!wasKickAboveRef.current && isKickAbove && audioState.isPlaying) {
      kickPulseRef.current = audioState.kick
    }

    wasKickAboveRef.current = isKickAbove
    kickPulseRef.current = Math.max(0, kickPulseRef.current - dt * BOOST_FALLOFF)

    const colorAttribute = mesh.geometry.getAttribute('color') as BufferAttribute
    const colors = colorAttribute.array as Float32Array

    writeBoostColors(colors, sections, pulsesRef.current, baseColor, kickPulseRef.current, dt)
    colorAttribute.needsUpdate = true
  })
}

export default useBoostTilesReactivity
