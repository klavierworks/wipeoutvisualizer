import { useFrame } from '@react-three/fiber'
import { MutableRefObject, useEffect, useRef, useState } from 'react'
import { Group, Matrix4, Quaternion, Vector3 } from 'three'
import { audioState } from '../audio'
import type { Built } from '../constructor'
import { cloneWarpShip, disposeWarpShip, type WarpShip } from './utils/warpShip'

type Racer = {
  // Active ship model. The outgoing ship disperses (uWarp 0 → 1); the
  // incoming ship starts fully dispersed and reassembles (uWarp 1 → 0),
  // offset so it begins partway through the outgoing ship's dispersal for
  // visual overlap rather than a strict sequence.
  incoming: WarpShip
  outgoing: WarpShip | null
  // Source template (from ships.meshes) the incoming clone was built from.
  // Tracked so the next swap can guarantee a visually different ship — we
  // pick any pool entry that isn't this reference.
  template: Group
  // Seconds since the current warp started, or -1 if no warp in flight.
  warpElapsed: number
  t: number
  startLane: number
  laneAmplitude: number
  laneFreq: number
  lanePhase: number
  speedAmplitude: number
  speedFreq: number
  speedPhase: number
  barOffset: number
  roll: number
  // Airtime state. While grounded the ship sits on the spline with its
  // velocity matching the curve's 3D tangent. When the track pitches past
  // LAUNCH_ANGLE the ship unclips — pos/vel evolve in world space, with a
  // mild anti-grav pull arcing the ship down — until pos meets the spline
  // again on the far side and it re-grounds.
  pos: Vector3
  vel: Vector3
  prevSplinePos: Vector3
  pitch: number
  airborne: boolean
  seeded: boolean
}

export const RACER_COUNT = 8
const BASE_SPEED = 0.02
const BOOST_TILE_GAIN = 1.5
const TWO_PI = Math.PI * 2
const SHIP_HOVER_HEIGHT = 200

// Starting grid. Ships are laid out in GRID_COLS columns trailing back from the
// start line (t = 0), with a static per-column lateral offset added on top of
// the usual weave. Ship 0 is the pole position (front of the grid).
const GRID_COLS = 2
const GRID_ROW_GAP = 0.005
const GRID_COL_WIDTH = 500

// Audio reactivity gains. Multipliers on BASE_SPEED.
//   BASS_GAIN   - smooth sustain that lifts speed during energetic sections
//   KICK_GAIN   - short forward punch on bass onsets
//   BAR_GAIN    - per-ship sinusoidal surge around the 4-beat bar, phased so
//                 racers don't move in lockstep
const BASS_GAIN = 0.35
const KICK_GAIN = 0.45
const BAR_GAIN = 0.15

// Corner banking. LOOK_AHEAD samples the tangent slightly ahead to estimate
// the track's horizontal turn rate; the ship rolls around its forward axis
// proportionally, like Wipeout air-brake banking.
const LOOK_AHEAD = 0.006
const ROLL_GAIN = 8
const MAX_ROLL = 0.45
const ROLL_LERP = 6

// Airtime. Ships are anti-grav and hug the spline for normal terrain; only
// when the curve pitches steeper than LAUNCH_ANGLE (i.e. a jump lip or hard
// crest) does the ship unclip and coast in world space. Forward velocity
// persists through the arc, so horizontal distance scales with speed for
// free — a faster ship covers more ground before AIR_GRAVITY pulls it back
// to meet the spline. AIR_GRAVITY is intentionally much weaker than real
// gravity so the arc reads as a glide, not a fall.
const LAUNCH_ANGLE = (22 * Math.PI) / 180
const AIR_GRAVITY = 400
const MAX_PITCH = 0.55
const PITCH_LERP = 8

// Outgoing ship disperses over WARP_OUT_DURATION. The incoming ship begins
// reassembling after INCOMING_DELAY seconds (a fraction of the outgoing
// window), then takes WARP_IN_DURATION to fully solidify. So the two motions
// overlap rather than running back-to-back.
const WARP_OUT_DURATION = 0.5
const WARP_IN_DURATION = 0.5
const INCOMING_DELAY = 0.25 * WARP_OUT_DURATION

const makeRacer = (index: number, total: number, template: Group): Racer => {
  const row = Math.floor(index / GRID_COLS)
  const col = index % GRID_COLS
  return {
    incoming: cloneWarpShip(template),
    outgoing: null,
    template,
    warpElapsed: -1,
    t: (1 - row * GRID_ROW_GAP + 1) % 1,
    startLane: (col - (GRID_COLS - 1) / 2) * GRID_COL_WIDTH,
    laneAmplitude: 400 + Math.random() * 600,
    laneFreq: 1 + Math.random() * 2,
    lanePhase: Math.random() * TWO_PI,
    speedAmplitude: 0.1 + Math.random() * 0.2,
    speedFreq: 1 + Math.random() * 3,
    speedPhase: Math.random() * TWO_PI,
    barOffset: index / total,
    roll: 0,
    pos: new Vector3(),
    vel: new Vector3(),
    prevSplinePos: new Vector3(),
    pitch: 0,
    airborne: false,
    seeded: false,
  }
}

const UP = new Vector3(0, 1, 0)
const CORRECTION = new Quaternion().setFromAxisAngle(UP, Math.PI)

const _pos = new Vector3()
const _tangent = new Vector3()
const _aheadTangent = new Vector3()
const _basisX = new Vector3()
const _basisY = new Vector3()
const _basisZ = new Vector3()
const _matrix = new Matrix4()
const _rollQuat = new Quaternion()
const _pitchQuat = new Quaternion()
const _splinePos = new Vector3()
const _splineVel = new Vector3()

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

type Props = {
  ships: Built['ships']
  leaderRef?: MutableRefObject<Group | null>
  leaderTRef?: MutableRefObject<number>
  // Shared buffer of every racer's current t. Sized RACER_COUNT; written
  // once per frame so other systems (e.g. Track's boost pass-over flash)
  // can react to any ship, not just the leader.
  racerTsRef?: MutableRefObject<Float32Array>
  // Debug / authoring override: when non-null, racer 0 (the leader)
  // warps to this mesh instead of whatever the level pool would pick. On
  // change, only the leader warps — the rest of the field is unaffected.
  leaderMeshOverride?: Group | null
}

export const Ships = ({
  ships,
  leaderRef,
  leaderTRef,
  racerTsRef,
  leaderMeshOverride,
}: Props) => {
  const refs = useRef<(Group | null)[]>([])
  // Racer 0 uses the override when one is set; every other racer draws from
  // the level's pool. Leader's initial pick is randomised so the chase-cam
  // doesn't always start on meshes[0] — stored in a ref so re-renders don't
  // reshuffle it under us.
  const leaderInitialRef = useRef<Group | null>(null)
  if (leaderInitialRef.current === null) {
    leaderInitialRef.current = ships.meshes[Math.floor(Math.random() * ships.meshes.length)]
  }
  const templateFor = (i: number): Group => {
    if (i === 0 && leaderMeshOverride) return leaderMeshOverride
    if (i === 0) return leaderInitialRef.current!
    return ships.meshes[i % ships.meshes.length]
  }
  // Racer state survives level swaps: only the spline/scene underneath
  // changes; each ship's `t`, lane parameters, banking roll and mesh clone
  // persist so they stay at the same progress around the new track.
  const racersRef = useRef<Racer[] | null>(null)
  if (racersRef.current === null) {
    racersRef.current = Array.from({ length: RACER_COUNT }, (_, i) =>
      makeRacer(i, RACER_COUNT, templateFor(i))
    )
  }
  const racers = racersRef.current

  // Spline identity changes on level swap. Ships keep their `t` (so they
  // stay at the same track progress) but vertical state is tied to the old
  // spline's heights and would leave them hovering or buried — reset it.
  useEffect(() => {
    for (const r of racers) r.seeded = false
  }, [racers, ships.spline])

  // Section / level changes swap in a fresh ship pool. For each racer, demote
  // the current incoming to outgoing (it'll disperse) and spawn a new
  // incoming pre-dispersed at uWarp = 1, animating back to 0. A render bump
  // mounts the new <primitive> nodes so both ships render at the racer's
  // transform during the warp.
  const isFirstMount = useRef(true)
  const [, forceRender] = useState(0)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    for (let i = 0; i < racers.length; i++) {
      const r = racers[i]
      // If a previous transition is still mid-flight the prior outgoing is
      // still mounted. Free its cloned materials before we drop the reference.
      if (r.outgoing) disposeWarpShip(r.outgoing)
      r.outgoing = r.incoming
      r.outgoing.uniforms.uWarp.value = 0
      r.outgoing.group.visible = true
      // Pick a template from the new pool that isn't the one we were just
      // flying — guarantees a visibly different ship on each warp. Falls
      // back to the first entry only if the pool has no alternative. Racer 0
      // honours the debug override (setMesh) when one is set so level swaps
      // don't stomp it.
      const useOverride = i === 0 && leaderMeshOverride != null
      const alternatives = ships.meshes.filter((m) => m !== r.template)
      const nextTemplate = useOverride
        ? leaderMeshOverride!
        : alternatives.length > 0
          ? alternatives[Math.floor(Math.random() * alternatives.length)]
          : ships.meshes[0]
      r.template = nextTemplate
      r.incoming = cloneWarpShip(nextTemplate)
      r.incoming.uniforms.uWarp.value = 1
      r.warpElapsed = 0
    }
    forceRender((n) => n + 1)
  }, [racers, ships.meshes])

  // Dev override change — warp only racer 0 to the new mesh. Skip the first
  // mount so the initial template (already applied during racer construction)
  // isn't immediately re-swapped.
  const isFirstOverrideMount = useRef(true)
  useEffect(() => {
    if (isFirstOverrideMount.current) {
      isFirstOverrideMount.current = false
      return
    }
    const r = racers[0]
    const nextTemplate = templateFor(0)
    if (r.template === nextTemplate) return
    if (r.outgoing) disposeWarpShip(r.outgoing)
    r.outgoing = r.incoming
    r.outgoing.uniforms.uWarp.value = 0
    r.outgoing.group.visible = true
    r.template = nextTemplate
    r.incoming = cloneWarpShip(nextTemplate)
    r.incoming.uniforms.uWarp.value = 1
    r.warpElapsed = 0
    forceRender((n) => n + 1)
    // templateFor is recomputed each render; we only need to react to the
    // override identity changing, so that's the sole dependency here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaderMeshOverride])

  useFrame((_, dt) => {
    const { spline } = ships
    const bassBoost = 1 + audioState.bass * BASS_GAIN + audioState.kick * KICK_GAIN
    for (let i = 0; i < racers.length; i++) {
      const racer = racers[i]
      const ref = refs.current[i]
      if (!ref) continue

      if (racer.warpElapsed >= 0) {
        racer.warpElapsed += dt
        if (racer.outgoing) {
          const outP = Math.min(1, racer.warpElapsed / WARP_OUT_DURATION)
          racer.outgoing.uniforms.uWarp.value = outP
          if (outP >= 1) racer.outgoing.group.visible = false
        }
        const inP = Math.min(
          1,
          Math.max(0, (racer.warpElapsed - INCOMING_DELAY) / WARP_IN_DURATION),
        )
        racer.incoming.uniforms.uWarp.value = 1 - inP
        const outDone = !racer.outgoing || racer.warpElapsed >= WARP_OUT_DURATION
        if (outDone && inP >= 1) racer.warpElapsed = -1
      }

      const intrinsic =
        1 + Math.sin(racer.t * racer.speedFreq * TWO_PI + racer.speedPhase) * racer.speedAmplitude
      // Per-ship surge: phased around the bar so racers punch on different beats
      // rather than the whole field accelerating together.
      const barSurge = 1 + Math.sin((audioState.barPhase + racer.barOffset) * TWO_PI) * BAR_GAIN
      const tileBoost = spline.boostAtT(racer.t) ? BOOST_TILE_GAIN : 1
      const speedMod = intrinsic * bassBoost * barSurge * tileBoost
      racer.t = (racer.t + BASE_SPEED * speedMod * dt) % 1
      if (i === 0 && leaderTRef) leaderTRef.current = racer.t
      if (racerTsRef) racerTsRef.current[i] = racer.t

      // Plume length (shared by every nozzle on the ship via its material's
      // uLength uniform). 150 is the baseline in ship-local units; speedMod
      // already bundles audio bass/kick and per-ship speed multipliers, and
      // BOOST_TILE_GAIN lifts it ~1.5× on boost tiles.
      const plume = 150 * speedMod
      racer.incoming.uniforms.uPlume.value = plume
      if (racer.outgoing) racer.outgoing.uniforms.uPlume.value = plume

      spline.curve.getPointAt(racer.t, _pos)
      spline.curve.getTangentAt(racer.t, _tangent).normalize()

      _basisX.crossVectors(UP, _tangent).normalize()
      _basisY.crossVectors(_tangent, _basisX)
      _basisZ.copy(_tangent)
      _matrix.makeBasis(_basisX, _basisY, _basisZ)

      const lane =
        racer.startLane +
        Math.sin(racer.t * racer.laneFreq * TWO_PI + racer.lanePhase) * racer.laneAmplitude
      _splinePos.set(
        _pos.x + _basisX.x * lane,
        _pos.y + SHIP_HOVER_HEIGHT,
        _pos.z + _basisX.z * lane
      )

      if (!racer.seeded) {
        racer.pos.copy(_splinePos)
        racer.vel.set(0, 0, 0)
        racer.prevSplinePos.copy(_splinePos)
        racer.pitch = 0
        racer.airborne = false
        racer.seeded = true
      }

      // World-space velocity of the point-on-spline a ship is *riding*.
      // Numerically differenced from the last frame's sample so it reflects
      // the curve's actual motion, tangents and all.
      const safeDt = Math.max(dt, 1e-4)
      _splineVel.subVectors(_splinePos, racer.prevSplinePos).divideScalar(safeDt)
      racer.prevSplinePos.copy(_splinePos)

      const horizSpeed = Math.sqrt(
        _splineVel.x * _splineVel.x + _splineVel.z * _splineVel.z
      )
      const tangentHorizMag = Math.max(
        Math.sqrt(_tangent.x * _tangent.x + _tangent.z * _tangent.z),
        1e-6
      )

      if (!racer.airborne) {
        // Launch the moment the track pitches past LAUNCH_ANGLE downward.
        // tan(angle) × horizontal speed is the vertical rate that angle
        // implies at the ship's current forward speed, so the test scales
        // with speed automatically.
        const launchThreshold = horizSpeed * Math.tan(LAUNCH_ANGLE)
        if (_splineVel.y < -launchThreshold && horizSpeed > 1) {
          racer.airborne = true
          // Inherit the ship's last grounded velocity, but clip vy so the
          // ship leaves the lip gliding forward rather than already diving.
          racer.vel.copy(_splineVel)
          racer.vel.y = Math.max(racer.vel.y, -launchThreshold)
        } else {
          // Grounded: stay on the spline, velocity matches the curve.
          racer.pos.copy(_splinePos)
          racer.vel.copy(_splineVel)
        }
      }

      if (racer.airborne) {
        racer.vel.y -= AIR_GRAVITY * dt
        racer.pos.addScaledVector(racer.vel, dt)
        // Land when the spline catches up to the ship from below. Snap the
        // ship's (x, z) to splinePos so any lateral drift during the arc —
        // from a curved jump — doesn't leave it floating off the track.
        if (racer.pos.y <= _splinePos.y) {
          racer.pos.copy(_splinePos)
          racer.vel.copy(_splineVel)
          racer.airborne = false
        }
      }

      ref.position.copy(racer.pos)

      // Pitch offset: the ship's actual flight angle minus the spline's.
      // Zero when grounded (vel = splineVel), positive nose-up mid-arc,
      // negative nose-down on the descent side.
      const velHoriz = Math.max(
        Math.sqrt(racer.vel.x * racer.vel.x + racer.vel.z * racer.vel.z),
        1e-3
      )
      const pitchTarget = clamp(
        Math.atan2(racer.vel.y, velHoriz) - Math.atan2(_tangent.y, tangentHorizMag),
        -MAX_PITCH,
        MAX_PITCH
      )
      const pitchAlpha = 1 - Math.exp(-dt * PITCH_LERP)
      racer.pitch += (pitchTarget - racer.pitch) * pitchAlpha

      // Bank into the corner: sample tangent just ahead and measure how far it
      // has swung sideways (projected onto the ship's right vector). Negative
      // so a rightward turn rolls the ship rightward rather than away.
      spline.curve.getTangentAt((racer.t + LOOK_AHEAD) % 1, _aheadTangent).normalize()
      const turn = _aheadTangent.dot(_basisX) - _tangent.dot(_basisX)
      const targetRoll = clamp(-turn * ROLL_GAIN, -MAX_ROLL, MAX_ROLL)
      const rollAlpha = 1 - Math.exp(-dt * ROLL_LERP)
      racer.roll += (targetRoll - racer.roll) * rollAlpha

      ref.quaternion.setFromRotationMatrix(_matrix).multiply(CORRECTION)
      _rollQuat.setFromAxisAngle(_tangent, racer.roll)
      ref.quaternion.premultiply(_rollQuat)
      _pitchQuat.setFromAxisAngle(_basisX, racer.pitch)
      ref.quaternion.premultiply(_pitchQuat)
    }
  })

  return (
    <>
      {racers.map((racer, i) => (
        <group
          key={i}
          ref={(r) => {
            refs.current[i] = r
            if (i === 0 && leaderRef) leaderRef.current = r
          }}
          scale={0.5}
        >
          <primitive key={racer.incoming.group.uuid} object={racer.incoming.group} />
          {racer.outgoing && (
            <primitive key={racer.outgoing.group.uuid} object={racer.outgoing.group} />
          )}
        </group>
      ))}
    </>
  )
}
