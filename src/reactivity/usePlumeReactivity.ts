import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

import type { Ship } from '../App/World/Ships/ship'
import type { WarpShip } from '../App/World/Ships/warpShip'

import { audioState } from '../audio'
import {
  BOOST_FACTOR_LERP,
  PLUME_BASS_FLARE_GAIN,
  PLUME_BASS_TRAIL_GAIN,
  PLUME_BOOST_BPM,
  PLUME_BPM_COLOR,
  PLUME_BPM_FLARE_SIZE,
  PLUME_BPM_TRAIL_LENGTH,
} from '../constants'
import { lookupColor, lookupNumber, sortedKeys } from './derive/lookupTable'

const TRAIL_LENGTH_KEYS = sortedKeys(PLUME_BPM_TRAIL_LENGTH)
const FLARE_SIZE_KEYS = sortedKeys(PLUME_BPM_FLARE_SIZE)
const COLOR_KEYS = sortedKeys(PLUME_BPM_COLOR)

const usePlumeReactivity = (warpShip: WarpShip, ship: Ship) => {
  const boostFactorRef = useRef(0)
  const colorRef = useRef<[number, number, number]>([0, 0, 0])

  useFrame((_, dt) => {
    const target = ship.boost.timer > 0 ? 1 : 0
    const alpha = 1 - Math.exp(-dt * BOOST_FACTOR_LERP)

    boostFactorRef.current += (target - boostFactorRef.current) * alpha

    const factor = boostFactorRef.current
    const effectiveBpm = audioState.bpm * (1 - factor) + PLUME_BOOST_BPM * factor

    const baseTrail = lookupNumber(PLUME_BPM_TRAIL_LENGTH, TRAIL_LENGTH_KEYS, effectiveBpm)
    const baseFlare = lookupNumber(PLUME_BPM_FLARE_SIZE, FLARE_SIZE_KEYS, effectiveBpm)

    const trailLength = (baseTrail + audioState.bass * PLUME_BASS_TRAIL_GAIN) * window.plumeScale
    const flareSize = baseFlare + audioState.bass * PLUME_BASS_FLARE_GAIN

    lookupColor(PLUME_BPM_COLOR, COLOR_KEYS, effectiveBpm, colorRef.current)

    warpShip.uniforms.uTrailLength.value = trailLength
    warpShip.uniforms.uFlareSize.value = flareSize
    warpShip.uniforms.uColor.value = colorRef.current
  })
}

export default usePlumeReactivity
