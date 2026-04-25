import { useEffect, useRef, useState } from 'react'
import { Group } from 'three'

const pickAlternative = (pool: Group[], current: Group): Group => {
  const alternatives = pool.filter((mesh) => mesh !== current)

  if (alternatives.length === 0) {
    return pool[0]
  }

  return alternatives[Math.floor(Math.random() * alternatives.length)]
}

const pickAny = (pool: Group[]): Group => pool[Math.floor(Math.random() * pool.length)]

export const useRacerTemplates = (
  meshes: Group[],
  leaderOverride: Group | null | undefined,
  count: number,
): Group[] => {
  const leaderInitialRef = useRef<Group | null>(null)

  if (leaderInitialRef.current === null) {
    leaderInitialRef.current = pickAny(meshes)
  }

  const [templates, setTemplates] = useState<Group[]>(() =>
    Array.from({ length: count }, (_, i) =>
      i === 0 ? (leaderOverride ?? leaderInitialRef.current!) : meshes[i % meshes.length],
    ),
  )

  const previousMeshesRef = useRef(meshes)

  useEffect(() => {
    if (previousMeshesRef.current === meshes) {
      return
    }

    previousMeshesRef.current = meshes

    setTemplates((previous) =>
      previous.map((current, i) =>
        i === 0 ? (leaderOverride ?? pickAny(meshes)) : pickAlternative(meshes, current),
      ),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meshes])

  const previousOverrideRef = useRef(leaderOverride)

  useEffect(() => {
    if (previousOverrideRef.current === leaderOverride) {
      return
    }

    previousOverrideRef.current = leaderOverride

    setTemplates((previous) => {
      const desired = leaderOverride ?? leaderInitialRef.current!

      if (previous[0] === desired) {
        return previous
      }

      const next = [...previous]
      next[0] = desired

      return next
    })
  }, [leaderOverride])

  return templates
}
