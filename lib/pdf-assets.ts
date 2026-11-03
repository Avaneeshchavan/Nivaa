import { createClient } from '@/lib/supabase/server'
import type { Doctor } from '@/lib/generated/prisma/client'

export async function getPdfAssets(doctor: Doctor) {
  const supabase = await createClient()
  const image = async (bucket: string, path: string) => {
    const { data } = await supabase.storage.from(bucket).download(path)
    if (!data || data.size > 1024 * 1024 || !['image/png', 'image/jpeg'].includes(data.type)) return undefined
    return `data:${data.type};base64,${Buffer.from(await data.arrayBuffer()).toString('base64')}`
  }
  let logoPath: string | undefined
  try {
    const url = new URL(doctor.logoUrl || '')
    const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin
    const prefix = '/storage/v1/object/public/logos/'
    const path = decodeURIComponent(url.pathname.slice(prefix.length))
    if (url.origin === origin && url.pathname.startsWith(prefix) &&
      [doctor.id, doctor.supabaseId].includes(path.split('/')[0]) && !path.includes('..')) logoPath = path
  } catch { /* No approved logo configured. Never fetch arbitrary profile URLs. */ }
  const [logoUrl, signatureUrl] = await Promise.all([
    logoPath ? image('logos', logoPath) : undefined,
    image('signatures', `${doctor.supabaseId}/signature.png`),
  ])
  return { logoUrl, signatureUrl }
}
