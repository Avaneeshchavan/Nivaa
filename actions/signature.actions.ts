'use server'

import { getCurrentDoctor } from './auth.actions'
import { createClient } from '@/lib/supabase/server'

export async function uploadSignature(formData: FormData) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')
  const file = formData.get('signature')
  if (!(file instanceof File) || file.size === 0 || file.size > 1024 * 1024) throw new Error('Choose an image under 1 MB')
  const bytes = Buffer.from(await file.arrayBuffer())
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  if (!png && !jpeg) throw new Error('Signature must be PNG or JPEG')
  const supabase = await createClient()
  const { error } = await supabase.storage.from('signatures').upload(`${doctor.supabaseId}/signature.png`, bytes, {
    contentType: png ? 'image/png' : 'image/jpeg', upsert: true, cacheControl: '0',
  })
  if (error) throw new Error('Signature upload unavailable. Check private bucket configuration.')
}
