// Route handlers need an explicit body limit independent of Server Actions.
export async function readSmallJson(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json') || !request.body) throw new Error('Invalid request')
  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let bytes = 0
  let text = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > 4096) { await reader.cancel(); throw new Error('Request too large') }
      text += decoder.decode(value, { stream: true })
    }
    return JSON.parse(text + decoder.decode()) as unknown
  } finally { reader.releaseLock() }
}
