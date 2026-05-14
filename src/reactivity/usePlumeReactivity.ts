import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

import type { Ship } from '../App/World/Ships/ship'
import type { WarpShip } from '../App/World/Ships/warpShip'

import { audioState } from '../audio'
import {
  BOOST_FACTOR_LERP,
  BPM_CONFIDENCE_GAIN,
  PLUME_BASS_FLARE_GAIN,
  PLUME_BASS_TRAIL_GAIN,
  PLUME_BEAT_WIDTH_PEAK,
  PLUME_BOOST_BPM,
  PLUME_BPM_COLOR,
  PLUME_BPM_FLARE_SIZE,
  PLUME_BPM_TRAIL_LENGTH,
  PLUME_WIDTH_LERP,
  TWO_PI,
} from '../constants'
import { lookupColor, lookupNumber, sortedKeys } from './derive/lookupTable'

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

const TRAIL_LENGTH_KEYS = sortedKeys(PLUME_BPM_TRAIL_LENGTH)
const FLARE_SIZE_KEYS = sortedKeys(PLUME_BPM_FLARE_SIZE)
const COLOR_KEYS = sortedKeys(PLUME_BPM_COLOR)

const calculateBeatWidthTarget = (): number => {
  if (audioState.bpm <= 0) {
    return 1
  }

  const pulse = (1 + Math.cos(TWO_PI * audioState.beatPhase)) / 2

  return 1 + (PLUME_BEAT_WIDTH_PEAK - 1) * pulse
}

const usePlumeReactivity = (warpShip: WarpShip, ship: Ship) => {
  const boostFactorRef = useRef(0)
  const widthRef = useRef(1)
  const colorRef = useRef<[number, number, number]>([0, 0, 0])

  useFrame((_, dt) => {
    const target = ship.boost.timer > 0 ? 1 : 0
    const alpha = 1 - Math.exp(-dt * BOOST_FACTOR_LERP)

    boostFactorRef.current += (target - boostFactorRef.current) * alpha

    const factor = boostFactorRef.current
    // Below-confidence beats can leave a stale `audioState.bpm` value. Fade
    // its contribution to the plume map by the rescaled aubio confidence so
    // the trail relaxes back to its idle look during vocal passages or
    // intros where the tempo lock is shaky.
    const trustedBpm = audioState.bpm * clamp01(audioState.bpmConfidence * BPM_CONFIDENCE_GAIN)
    const effectiveBpm = trustedBpm * (1 - factor) + PLUME_BOOST_BPM * factor

    const widthTarget = calculateBeatWidthTarget()
    const widthAlpha = 1 - Math.exp(-dt * PLUME_WIDTH_LERP)

    widthRef.current += (widthTarget - widthRef.current) * widthAlpha

    const baseTrail = lookupNumber(PLUME_BPM_TRAIL_LENGTH, TRAIL_LENGTH_KEYS, effectiveBpm)
    const baseFlare = lookupNumber(PLUME_BPM_FLARE_SIZE, FLARE_SIZE_KEYS, effectiveBpm)

    const trailLength =
      (baseTrail + audioState.bass * PLUME_BASS_TRAIL_GAIN) * widthRef.current * window.plumeScale
    const flareSize = (baseFlare + audioState.bass * PLUME_BASS_FLARE_GAIN) * widthRef.current

    lookupColor(PLUME_BPM_COLOR, COLOR_KEYS, effectiveBpm, colorRef.current)

    warpShip.uniforms.uTrailLength.value = trailLength
    warpShip.uniforms.uFlareSize.value = flareSize
    warpShip.uniforms.uColor.value = colorRef.current
  })
}

export default usePlumeReactivity
