import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { Group } from 'three'

import { INCOMING_DELAY, WARP_IN_DURATION, WARP_OUT_DURATION } from '../../../constants'
import { cloneWarpShip, disposeWarpShip, type WarpShip } from './warpShip'

export type WarpClones = {
  current: WarpShip
  departing: null | WarpShip
}

const initialClones = (template: Group): WarpClones => {
  const current = cloneWarpShip(template)

  current.uniforms.uWarp.value = 0

  return { current, departing: null }
}

const useWarpTransition = (template: Group): WarpClones => {
  const [clones, setClones] = useState<WarpClones>(() => initialClones(template))
  const warpElapsedRef = useRef<null | number>(null)
  const previousTemplateRef = useRef(template)

  useEffect(() => {
    if (previousTemplateRef.current === template) {
      return
    }

    previousTemplateRef.current = template

    setClones((previous) => {
      if (previous.departing) {
        disposeWarpShip(previous.departing)
      }

      const departing = previous.current

      departing.uniforms.uWarp.value = 0
      departing.group.visible = true

      const current = cloneWarpShip(template)

      current.uniforms.uWarp.value = 1

      return { current, departing }
    })

    warpElapsedRef.current = 0
  }, [template])

  useFrame((_, dt) => {
    if (warpElapsedRef.current === null) {
      return
    }

    warpElapsedRef.current += dt

    if (clones.departing) {
      const outgoingProgress = Math.min(1, warpElapsedRef.current / WARP_OUT_DURATION)

      clones.departing.uniforms.uWarp.value = outgoingProgress

      if (outgoingProgress >= 1) {
        clones.departing.group.visible = false
      }
    }

    const incomingProgress = Math.min(1, Math.max(0, (warpElapsedRef.current - INCOMING_DELAY) / WARP_IN_DURATION))

    clones.current.uniforms.uWarp.value = 1 - incomingProgress

    const isOutgoingDone = !clones.departing || warpElapsedRef.current >= WARP_OUT_DURATION

    if (isOutgoingDone && incomingProgress >= 1) {
      warpElapsedRef.current = null
    }
  })

  return clones
}

export default useWarpTransition
