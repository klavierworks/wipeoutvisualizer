const FLAG_NAME = 'isFakeLoading'

export const isFakeLoading = (): boolean =>
  new URLSearchParams(window.location.search).get(FLAG_NAME) === 'true'

export const fakeLoadingDelay = (ms: number): Promise<void> => {
  if (!isFakeLoading()) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
