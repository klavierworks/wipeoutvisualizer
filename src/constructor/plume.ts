import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, Mesh, ShaderMaterial } from 'three'

import { PLUME_WIDTH } from './constants'

const buildTrailGeometry = (): BufferGeometry => {
  const w = PLUME_WIDTH

  const positions = new Float32Array([
    -w, 0, 0, w, 0, 0, w, 0, 1, -w, 0, 0, w, 0, 1, -w, 0, 1, 0, -w, 0, 0, w, 0, 0, w, 1, 0, -w, 0, 0, w, 1, 0, -w, 1,
  ])

  const alongs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1])
  const acrosses = new Float32Array([-1, 1, 1, -1, 1, -1, -1, 1, 1, -1, 1, -1])

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aAlongPlume', new BufferAttribute(alongs, 1))
  geometry.setAttribute('aAcrossPlume', new BufferAttribute(acrosses, 1))

  return geometry
}

const buildFlareGeometry = (): BufferGeometry => {
  const corners = new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1])
  const positions = new Float32Array(corners.length * (3 / 2))

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aCorner', new BufferAttribute(corners, 2))

  return geometry
}

const TRAIL_VERT = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  uniform float uTrailLength;
  attribute float aAlongPlume;
  attribute float aAcrossPlume;
  varying float vAlong;
  varying float vAcross;
  void main() {
    float taper = 1.0 - aAlongPlume * 0.5;
    vec3 pos = vec3(position.x * taper, position.y * taper, position.z * uTrailLength);
    vAlong = aAlongPlume;
    vAcross = aAcrossPlume;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    #include <logdepthbuf_vertex>
  }
`

const TRAIL_FRAG = `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 uColor;
  varying float vAlong;
  varying float vAcross;
  void main() {
    #include <logdepthbuf_fragment>
    float lengthFade = 1.0 - vAlong;
    lengthFade *= lengthFade;
    float widthFade = 1.0 - vAcross * vAcross;
    gl_FragColor = vec4(uColor * lengthFade * widthFade, 1.0);
  }
`

const FLARE_VERT = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  uniform float uFlareSize;
  attribute vec2 aCorner;
  varying vec2 vCorner;
  void main() {
    vec4 anchorView = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec4 offsetView = vec4(aCorner * uFlareSize, 0.0, 0.0);
    gl_Position = projectionMatrix * (anchorView + offsetView);
    vCorner = aCorner;
    #include <logdepthbuf_vertex>
  }
`

const FLARE_FRAG = `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 uColor;
  varying vec2 vCorner;
  void main() {
    #include <logdepthbuf_fragment>
    float r2 = dot(vCorner, vCorner);
    float core = exp(-r2 * 12.0) * 0.7;
    float halo = exp(-r2 * 1.5) * 0.20;
    float armX = exp(-vCorner.y * vCorner.y * 80.0) * exp(-vCorner.x * vCorner.x * 1.0) * 0.55;
    float armY = exp(-vCorner.x * vCorner.x * 80.0) * exp(-vCorner.y * vCorner.y * 1.0) * 0.55;
    float star = core + halo + armX + armY;
    gl_FragColor = vec4(uColor * star, 1.0);
  }
`

let trailGeometry: BufferGeometry | null = null
let flareGeometry: BufferGeometry | null = null

const getTrailGeometry = (): BufferGeometry => {
  if (!trailGeometry) {
    trailGeometry = buildTrailGeometry()
  }

  return trailGeometry
}

const getFlareGeometry = (): BufferGeometry => {
  if (!flareGeometry) {
    flareGeometry = buildFlareGeometry()
  }

  return flareGeometry
}

const createPlumeMaterial = (vertexShader: string, fragmentShader: string): ShaderMaterial =>
  new ShaderMaterial({
    blending: AdditiveBlending,
    depthWrite: false,
    fragmentShader,
    side: DoubleSide,
    transparent: true,
    uniforms: {
      uColor: { value: [0, 0, 0] },
      uFlareSize: { value: 0 },
      uTrailLength: { value: 0 },
    },
    vertexShader,
  })

const setupPlumeMesh = (mesh: Mesh, anchor: [number, number, number], name: string): void => {
  mesh.position.set(anchor[0], anchor[1], anchor[2])
  mesh.frustumCulled = false
  mesh.userData.isPlume = true
  mesh.name = name
}

export const createPlumeNozzle = (anchor: [number, number, number]): Mesh[] => {
  const trail = new Mesh(getTrailGeometry(), createPlumeMaterial(TRAIL_VERT, TRAIL_FRAG))
  setupPlumeMesh(trail, anchor, 'plume-trail')

  const flare = new Mesh(getFlareGeometry(), createPlumeMaterial(FLARE_VERT, FLARE_FRAG))
  setupPlumeMesh(flare, anchor, 'plume-flare')
  flare.renderOrder = 1

  return [trail, flare]
}
