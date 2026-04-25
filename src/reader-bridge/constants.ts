export const GAMEFILES = '/gamefiles'
export const COMMON_DIR = 'WIPEOUT2/COMMON'
export const WEAPON_ATLAS = 'MINE.CMP'

export const EXTRA_GEOMETRY: Record<string, { cmp: string; prm: string }> = {
  asteroid: { cmp: WEAPON_ATLAS, prm: 'ASTER.PRM' },
  collisionHulls: { cmp: 'ALCOL.CMP', prm: 'ALCOL.PRM' },
  electroBolt: { cmp: WEAPON_ATLAS, prm: 'EBOLT.PRM' },
  lights: { cmp: 'LIGHT.CMP', prm: 'LIGHT.PRM' },
  mine: { cmp: WEAPON_ATLAS, prm: 'MINE.PRM' },
  missile: { cmp: WEAPON_ATLAS, prm: 'MISS.PRM' },
  phantomLogo: { cmp: WEAPON_ATLAS, prm: 'PHANT.PRM' },
  powerBar: { cmp: 'PBAR.CMP', prm: 'PBAR.PRM' },
  quakeWall: { cmp: WEAPON_ATLAS, prm: 'WALL.PRM' },
  rapierLogo: { cmp: WEAPON_ATLAS, prm: 'RAPIE.PRM' },
  rescuer: { cmp: 'RESCU.CMP', prm: 'RESCU.PRM' },
  ring: { cmp: 'RINGT.CMP', prm: 'RINGT.PRM' },
  rocket: { cmp: WEAPON_ATLAS, prm: 'ROCK.PRM' },
  shield: { cmp: WEAPON_ATLAS, prm: 'SHLD.PRM' },
  spaceroid: { cmp: 'SROID.CMP', prm: 'SROID.PRM' },
  train: { cmp: 'TRAIN.CMP', prm: 'TRAIN.PRM' },
  vectorLogo: { cmp: WEAPON_ATLAS, prm: 'VECTO.PRM' },
  venomLogo: { cmp: WEAPON_ATLAS, prm: 'VENOM.PRM' },
  vrall: { cmp: WEAPON_ATLAS, prm: 'VRALL.PRM' },
  wierd: { cmp: 'WIERD.CMP', prm: 'WIERD.PRM' },
  wreckage: { cmp: 'WRECK.CMP', prm: 'WRECK.PRM' },
}

export const EXTRA_TEXTURES: Record<string, string> = {
  effects: 'EFFECTS.CMP',
  fonts: 'DRFONTS.CMP',
  hudIcons: 'WICONS.CMP',
  pickupIcons: 'WEPICON.CMP',
}
