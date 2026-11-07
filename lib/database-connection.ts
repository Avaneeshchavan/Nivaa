import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export function databaseConnection(connectionString: string | undefined) {
  if (!connectionString) throw new Error('Database configuration missing')
  const url = new URL(connectionString)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && process.env.NODE_ENV !== 'production'
  // pg URL flags override explicit SSL options, so discard flags that could weaken verification.
  for (const key of ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'sslaccept', 'uselibpqcompat']) url.searchParams.delete(key)
  const supabase = url.hostname.endsWith('.supabase.com') || url.hostname.endsWith('.supabase.co')
  return { connectionString: url.toString(), ssl: local ? false as const : {
    rejectUnauthorized: true,
    ...(supabase ? { ca: readFileSync(join(process.cwd(), 'lib/security/supabase-ca.crt'), 'utf8') } : {}),
  } }
}
