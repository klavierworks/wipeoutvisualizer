import { Billboard, Text } from '@react-three/drei'
import { useMemo } from 'react'

import type { TrackSpline } from '../../../constructor/trackSpline'

import { SECTION_LABEL_COLOR, SECTION_LABEL_FONT_SIZE } from '../../../constants'
import { buildSectionLabels } from './buildSectionLabels'

type SectionLabelsProps = {
  spline: TrackSpline
}

const SectionLabels = ({ spline }: SectionLabelsProps) => {
  const labels = useMemo(() => buildSectionLabels(spline), [spline])

  return (
    <>
      {labels.map((label) => (
        <Billboard key={label.index} position={label.position}>
          <Text color={SECTION_LABEL_COLOR} fontSize={SECTION_LABEL_FONT_SIZE}>
            {label.index}
          </Text>
        </Billboard>
      ))}
    </>
  )
}

export default SectionLabels
