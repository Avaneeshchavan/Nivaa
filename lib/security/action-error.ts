// Only fixed, application-authored messages may cross the data-action boundary.
// Database/SDK exceptions can embed query arguments or clinical JSON. Never
// attach the original exception as a cause or log it here.
const publicMessages = new Set([
  'Unauthorized', 'Patient not found', 'Patient not found or unauthorized', 'Patient unavailable',
  'Choose a JPEG photo under 750 KB', 'Invalid JPEG photo',
  'Too many uploads. Try again in a few minutes.', 'Photo could not be uploaded. Try again.',
])

export async function withSafeActionError<T>(fallback: string, operation: () => Promise<T>): Promise<T> {
  try { return await operation() }
  catch (error) {
    const message = error && typeof error === 'object' && 'message' in error ? error.message : null
    throw new Error(typeof message === 'string' && publicMessages.has(message) ? message : fallback)
  }
}
