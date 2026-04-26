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

const pickPinnedOrAny = (pool: Group[], pinnedIndex: null | number | undefined): Group => {
  if (pinnedIndex !== null && pinnedIndex !== undefined) {
    if (pinnedIndex >= 0 && pinnedIndex < pool.length) {
      return pool[pinnedIndex]
    }

    console.warn(`[ship] index ${pinnedIndex} out of range (0..${pool.length - 1}); using random`)
  }

  return pickAny(pool)
}

export const useRacerTemplates = (
  meshes: Group[],
  leaderOverride: Group | null | undefined,
  pinnedLeaderIndex: null | number | undefined,
  count: number,
): Group[] => {
  const leaderInitialRef = useRef<Group | null>(null)

  if (leaderInitialRef.current === null) {
    leaderInitialRef.current = pickPinnedOrAny(meshes, pinnedLeaderIndex)
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
        i === 0 ? (leaderOverride ?? pickPinnedOrAny(meshes, pinnedLeaderIndex)) : pickAlternative(meshes, current),
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
