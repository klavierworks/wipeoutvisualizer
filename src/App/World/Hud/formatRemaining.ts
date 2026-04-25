export const formatRemaining = (seconds: number): string => {
  const safe = Math.max(0, seconds)
  const tenths = Math.floor(safe * 10)
  const minutes = Math.floor(tenths / 600)
  const wholeSeconds = Math.floor(tenths / 10) % 60
  const decimal = tenths % 10

  return `${minutes}:${String(wholeSeconds).padStart(2, '0')}.${decimal}`
}
