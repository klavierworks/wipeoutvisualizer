import type { Group } from 'three'

type CrowdStandsProps = {
  stands: Group[]
}

const CrowdStands = ({ stands }: CrowdStandsProps) => (
  <>
    {stands.map((stand, index) => (
      <primitive key={index} object={stand} />
    ))}
  </>
)

export default CrowdStands
