import { Group, Mesh, MeshBasicMaterial, ShaderMaterial } from 'three'

import { WARP_FLY_DISTANCE } from '../../../constants'

export type WarpShip = {
  group: Group
  uniforms: WarpUniforms
}

export type WarpUniforms = {
  uColor: { value: [number, number, number] }
  uFlareSize: { value: number }
  uTrailLength: { value: number }
  uWarp: { value: number }
}

const installWarpPatch = (material: MeshBasicMaterial, uniforms: WarpUniforms) => {
  material.onBeforeCompile = (shader) => {
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

  material.needsUpdate = true
}

export const disposeWarpShip = (ship: WarpShip) => {
  ship.group.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }

    if (child.userData.isPlume) {
      const material = child.material as ShaderMaterial
      material.dispose()

      return
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material]

    for (const material of materials) {
      material.dispose()
    }
  })
}

export const cloneWarpShip = (template: Group): WarpShip => {
  const group = template.clone(true)

  const uniforms: WarpUniforms = {
    uColor: { value: [0, 0, 0] },
    uFlareSize: { value: 0 },
    uTrailLength: { value: 0 },
    uWarp: { value: 0 },
  }

  group.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }

    if (child.userData.isPlume) {
      const source = child.material as ShaderMaterial
      const cloned = source.clone()
      cloned.uniforms.uColor = uniforms.uColor
      cloned.uniforms.uTrailLength = uniforms.uTrailLength
      cloned.uniforms.uFlareSize = uniforms.uFlareSize
      child.material = cloned

      return
    }

    if (!child.geometry?.getAttribute('aTriCenter')) {
      return
    }

    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material]

    const clonedMaterials = sourceMaterials.map((source) => {
      const cloned = (source as MeshBasicMaterial).clone()
      installWarpPatch(cloned, uniforms)

      return cloned
    })

    child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0]
  })

  return { group, uniforms }
}
