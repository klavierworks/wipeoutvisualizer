export const fetchAudioBytes = async (src: string): Promise<ArrayBuffer> => {
  const response = await fetch(src)

  if (!response.ok) {
    throw new Error(`Failed to load ${src}: ${response.status}`)
  }

  return response.arrayBuffer()
}

export const decodeBytes = (context: AudioContext, bytes: ArrayBuffer): Promise<AudioBuffer> =>
  context.decodeAudioData(bytes.slice(0))

export const readFileBytes = (file: File): Promise<ArrayBuffer> => file.arrayBuffer()
