import { DoubleSide, FrontSide, MeshBasicMaterial, Side, Texture } from 'three'

export type MaterialsOptions = {
  side: Side
  vertexColors: boolean
}

export const createMaterials = (textures: Texture[], options: MaterialsOptions): MeshBasicMaterial[] => {
  const textured = textures.map(
    (map) =>
      new MeshBasicMaterial({
        alphaTest: 0.5,
        map,
        side: options.side,
        vertexColors: options.vertexColors,
      }),
  )

  const fallback = new MeshBasicMaterial({ side: options.side, vertexColors: options.vertexColors })

  return [...textured, fallback]
}

export const sceneMaterialOptions: MaterialsOptions = { side: FrontSide, vertexColors: true }
export const trackMaterialOptions: MaterialsOptions = { side: DoubleSide, vertexColors: true }
