import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Group } from 'three'

import type { TrackSpline } from '../../../constructor/trackSpline'

import {
  calculateCountdownState,
  type CountdownState,
} from '../../../reactivity/derive/calculateCountdownState'
import { applyCountdownTint, buildStartGantry, type BuiltStartGantry, COUNTDOWN_TINTS } from './startGantryUtils'

type StartGantryProps = {
  spline: TrackSpline
  template: Group | undefined
}

const StartGantry = ({ spline, template }: StartGantryProps) => {
  const built = useMemo<BuiltStartGantry | null>(() => {
    if (!template) {
      return null
    }
    return buildStartGantry(template, spline)
  }, [spline, template])

  const stateRef = useRef<CountdownState | null>(null)
  useFrame(() => {
    if (!built) {
      return
    }
    const next = calculateCountdownState()
    if (next === stateRef.current) {
      return
    }
    stateRef.current = next
    applyCountdownTint(built.colorAttrs, COUNTDOWN_TINTS[next])
  })

  if (!built) {
    return null
  }

  return <primitive object={built.gantry} rotation={[0,0,0]} />
}

export default StartGantry
