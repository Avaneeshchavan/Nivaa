import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { parseHandwriting } from '@/lib/validations/handwriting.schema'

export async function getHandwritingPhoto(supabaseId: string, handwriting: unknown) {
  const { photoId } = parseHandwriting(handwriting)
  if (!photoId) return undefined
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from('prescription-notes').download(`${supabaseId}/${photoId}.jpg`)
  if (error || !data) throw new Error('Handwritten photo unavailable. Try again before printing.')
  return `data:image/jpeg;base64,${Buffer.from(await data.arrayBuffer()).toString('base64')}`
}
