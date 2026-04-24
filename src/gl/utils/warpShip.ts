import { Group, Mesh, MeshBasicMaterial, ShaderMaterial } from 'three'

export type WarpUniforms = {
  uWarp: { value: number }
  // Plume length in ship-local units. Bound (by reference) into every
  // child plume mesh's `uLength` uniform when the ship is cloned, so a
  // single per-ship value drives all that ship's nozzles together.
  uPlume: { value: number }
}

export type WarpShip = {
  group: Group
  uniforms: WarpUniforms
}

// Distance (in ship-local units, before the racer's 0.5 scale) that fully
// dispersed triangles travel outward from the mesh center. Tuned by eye —
// large enough to read as "blown apart", small enough that the cloud doesn't
// clip into neighbouring racers at peak warp.
const WARP_FLY_DISTANCE = 60

const installWarpPatch = (mat: MeshBasicMaterial, uniforms: WarpUniforms) => {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWarp = uniforms.uWarp
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uWarp;
        attribute vec3 aTriCenter;
        attribute vec3 aFlyDir;
        attribute float aTriSeed;
        varying float vTriSeed;`,
      )
      .replace(
        '#include <begin_vertex>',
        `vTriSeed = aTriSeed;
        vec3 fromCentroid = position - aTriCenter;
        float angle = uWarp * (aTriSeed - 0.5) * 12.566;
        float s = sin(angle);
        float c = cos(angle);
        vec3 axis = aFlyDir;
        vec3 rotated = fromCentroid * c
          + cross(axis, fromCentroid) * s
          + axis * dot(axis, fromCentroid) * (1.0 - c);
        float flyDist = uWarp * uWarp * ${WARP_FLY_DISTANCE.toFixed(1)};
        vec3 transformed = aTriCenter + rotated + aFlyDir * flyDist;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uWarp;
        varying float vTriSeed;`,
      )
      .replace(
        '#include <alphatest_fragment>',
        `if (vTriSeed < uWarp) discard;
        #include <alphatest_fragment>`,
      )
  }
  mat.needsUpdate = true
}

// Clones a ship template and patches every Mesh's material(s) with the warp
// shader. All cloned materials share the ship's single uWarp value, so one
// assignment animates the whole ship as a unit.
// Releases the cloned materials. Geometries and textures are shared with the
// template and must NOT be disposed here.
export const disposeWarpShip = (ship: WarpShip) => {
  ship.group.traverse((obj) => {
    if (!(obj instanceof Mesh)) return
    if (obj.userData.isPlume) {
      const m = obj.material as ShaderMaterial
      m.dispose()
      return
    }
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
    for (const m of mats) m.dispose()
  })
}

export const cloneWarpShip = (template: Group): WarpShip => {
  const group = template.clone(true)
  const uniforms: WarpUniforms = { uWarp: { value: 0 }, uPlume: { value: 0 } }
  group.traverse((obj) => {
    if (!(obj instanceof Mesh)) return
    // Plume meshes use their own ShaderMaterial. Clone it so each racer has
    // its own uniform set, then retarget the cloned `uLength` uniform to
    // this ship's shared `uPlume` reference so driving uPlume animates all
    // of the ship's nozzles at once.
    if (obj.userData.isPlume) {
      const src = obj.material as ShaderMaterial
      const c = src.clone()
      c.uniforms.uLength = uniforms.uPlume
      obj.material = c
      return
    }
    // Sprites (and any non-warp geometry) lack the per-triangle attributes —
    // patching their material would compile a shader that reads undefined
    // attributes. Skip them; they'll render unwarped through the transition.
    if (!obj.geometry?.getAttribute('aTriCenter')) return
    const sourceMats = Array.isArray(obj.material) ? obj.material : [obj.material]
    const cloned = sourceMats.map((m) => {
      const c = (m as MeshBasicMaterial).clone()
      installWarpPatch(c, uniforms)
      return c
    })
    obj.material = Array.isArray(obj.material) ? cloned : cloned[0]
  })
  return { group, uniforms }
}
