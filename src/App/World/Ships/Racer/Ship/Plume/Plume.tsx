import { useFrame } from '@react-three/fiber'
import { MutableRefObject, useRef } from 'react'

import type { WarpShip } from '../../../warpShip'

import { audioState } from '../../../../../../audio'
import {
  BOOST_FACTOR_LERP,
  PLUME_BOOST_BPM,
  PLUME_BPM_COLOR,
  PLUME_BPM_FLARE_SIZE,
  PLUME_BPM_TRAIL_LENGTH,
} from '../../../../../../constants'
import { lookupColor, lookupNumber, sortedKeys } from './plumeLookup'

const TRAIL_LENGTH_KEYS = sortedKeys(PLUME_BPM_TRAIL_LENGTH)
const FLARE_SIZE_KEYS = sortedKeys(PLUME_BPM_FLARE_SIZE)
const COLOR_KEYS = sortedKeys(PLUME_BPM_COLOR)

type PlumeProps = {
  isBoostingRef: MutableRefObject<boolean>
  warpShip: WarpShip
}

const Plume = ({ isBoostingRef, warpShip }: PlumeProps) => {
  const boostFactorRef = useRef(0)
  const colorRef = useRef<[number, number, number]>([0, 0, 0])

  useFrame((_, dt) => {
    const target = isBoostingRef.current ? 1 : 0
    const alpha = 1 - Math.exp(-dt * BOOST_FACTOR_LERP)

    boostFactorRef.current += (target - boostFactorRef.current) * alpha

    const factor = boostFactorRef.current
    const effectiveBpm = audioState.bpm * (1 - factor) + PLUME_BOOST_BPM * factor

    const trailLength = lookupNumber(PLUME_BPM_TRAIL_LENGTH, TRAIL_LENGTH_KEYS, effectiveBpm) * window.plumeScale
    const flareSize = lookupNumber(PLUME_BPM_FLARE_SIZE, FLARE_SIZE_KEYS, effectiveBpm)

    lookupColor(PLUME_BPM_COLOR, COLOR_KEYS, effectiveBpm, colorRef.current)

    warpShip.uniforms.uTrailLength.value = trailLength
    warpShip.uniforms.uFlareSize.value = flareSize
    warpShip.uniforms.uColor.value = colorRef.current
  })

  return null
}

export default Plume
