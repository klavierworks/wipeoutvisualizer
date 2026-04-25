import type { SceneBundle } from '../../../constructor/scene'

import BeatLights from './BeatLights/BeatLights'
import CrowdStands from './CrowdStands/CrowdStands'
import Fans from './Fans/Fans'
import OilPumps from './OilPumps/OilPumps'
import StartBooms from './StartBooms/StartBooms'
import UvScrollers from './UvScrollers/UvScrollers'

type SceneProps = {
  bundle: SceneBundle
}

const Scene = ({ bundle }: SceneProps) => (
  <>
    <primitive object={bundle.base} />
    <BeatLights lights={bundle.beatLights} />
    <CrowdStands stands={bundle.crowdStands} />
    <Fans fans={bundle.fans} />
    <OilPumps pumps={bundle.oilPumps} />
    <StartBooms booms={bundle.startBooms} />
    <UvScrollers scrollers={bundle.uvScrollers} />
  </>
)

export default Scene
