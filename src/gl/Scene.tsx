import type { Group } from 'three'

type Props = Omit<JSX.IntrinsicElements['primitive'], 'object'> & { object: Group }

export const Scene = ({ object, ...rest }: Props) => <primitive object={object} {...rest} />
