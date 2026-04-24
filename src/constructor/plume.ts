import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Mesh,
  ShaderMaterial,
} from 'three'

// Width of each crossed plume quad, in ship-local PRM units. Ship extents
// are ~±180 on X and ~±75 on Y, so 22 reads as a small focused jet rather
// than a wide halo.
const PLUME_WIDTH = 22

// Two axis-aligned quads crossed at the local Z axis, extending from z=0
// (at the nozzle anchor) to z=1 (tip). The shader scales z by uLength, so
// one unit of geometry covers any plume length. Crossing two planes gives
// a volumetric look that reads well from any camera angle without needing
// billboarding or sprites.
const buildPlumeGeometry = (): BufferGeometry => {
  const w = PLUME_WIDTH
  const positions = new Float32Array([
    // XZ plane (width on X)
    -w, 0, 0, w, 0, 0, w, 0, 1, -w, 0, 0, w, 0, 1, -w, 0, 1,
    // YZ plane (width on Y)
    0, -w, 0, 0, w, 0, 0, w, 1, 0, -w, 0, 0, w, 1, 0, -w, 1,
  ])
  // aAlongPlume is 0 at the nozzle end, 1 at the tip — used by the frag
  // shader to fade alpha along the length.
  const alongs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1])
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aAlongPlume', new BufferAttribute(alongs, 1))
  return geometry
}

const PLUME_VERT = /* glsl */ `
  uniform float uLength;
  attribute float aAlongPlume;
  varying float vAlong;
  void main() {
    vec3 transformed = vec3(position.x, position.y, position.z * uLength);
    vAlong = aAlongPlume;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`

const PLUME_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying float vAlong;
  void main() {
    // Bright near the nozzle, fading to zero at the tip. Squared for a
    // tighter concentration at the hot core of the jet.
    float a = 1.0 - vAlong;
    gl_FragColor = vec4(uColor * uIntensity, a * a * uIntensity);
  }
`

// Shared template geometry — cloned-by-reference across every plume on
// every ship since the shape is identical. Only materials are per-ship.
let sharedGeometry: BufferGeometry | null = null
const getSharedGeometry = (): BufferGeometry => {
  if (!sharedGeometry) sharedGeometry = buildPlumeGeometry()
  return sharedGeometry
}

// anchor is the nozzle position in SHIP-LOCAL BUFFER space (i.e. after
// objectVertexTransform's Y and Z flips have been applied — the caller
// converts from raw PRM coordinates). The mesh's own local +Z extends
// backward from the ship; rotate 180° around Y so extending along +Z in
// geometry-space maps to -Z in parent space (= buffer +Z after flip).
export const createPlumeMesh = (anchor: [number, number, number]): Mesh => {
  const geometry = getSharedGeometry()
  const material = new ShaderMaterial({
    uniforms: {
      uLength: { value: 0 },
      uIntensity: { value: 1 },
      uColor: { value: [0.55, 0.8, 1.4] },
    },
    vertexShader: PLUME_VERT,
    fragmentShader: PLUME_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const mesh = new Mesh(geometry, material)
  mesh.position.set(anchor[0], anchor[1], anchor[2])
  // The ship's tail in buffer-local space sits at +Z (objectVertexTransform
  // flips PRM Z). Our plume geometry grows along its own local +Z, so no
  // rotation is needed — parent +Z aligns with geometry +Z.
  mesh.frustumCulled = false
  mesh.userData.isPlume = true
  mesh.name = 'plume'
  return mesh
}
