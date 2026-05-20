// Generación de imágenes con Pollinations.ai
// 100% gratuito · sin API key · ~3-5 segundos

export interface GeneratedImage {
  url:    string       // URL original para preview en la UI
  buffer: ArrayBuffer  // Bytes para subir a Meta
}

export async function generateAdImage(prompt: string): Promise<GeneratedImage> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1200&height=628&nologo=true&enhance=true&seed=${Date.now()}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Pollinations.ai error: ${res.status}`)

  const buffer = await res.arrayBuffer()
  if (buffer.byteLength < 10000) throw new Error('Imagen generada inválida o vacía')

  return { url, buffer }
}
