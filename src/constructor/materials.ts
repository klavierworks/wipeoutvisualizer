import { DoubleSide, FrontSide, MeshBasicMaterial, Side, Texture } from 'three'

export type MaterialsOptions = {
  vertexColors: boolean
  side: Side
}

export const createMaterials = (textures: Texture[], options: MaterialsOptions): MeshBasicMaterial[] => {
  const textured = textures.map(
    (map) =>
      new MeshBasicMaterial({
        map,
        vertexColors: options.vertexColors,
        side: options.side,
        alphaTest: 0.5,
      })
  )
  const fallback = new MeshBasicMaterial({ vertexColors: options.vertexColors, side: options.side })
  return [...textured, fallback]
}

export const sceneMaterialOptions: MaterialsOptions = { vertexColors: true, side: FrontSide }
export const trackMaterialOptions: MaterialsOptions = { vertexColors: true, side: DoubleSide }
