import nextEnv from '@next/env'
import { Client } from 'pg'
import { readFileSync } from 'node:fs'
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} })
let client
try {
  const url = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL)
  for (const key of ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat']) url.searchParams.delete(key)
  client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 10000, ssl: { rejectUnauthorized: true, ca: readFileSync('lib/security/supabase-ca.crt', 'utf8') } })
  await client.connect()
  await client.query('SELECT 1')
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }, signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error('Auth unavailable')
  console.log('PASS database and Auth available over verified TLS; no patient data queried')
} catch { console.error('FAIL database or Auth unavailable. Check Supabase project status.'); process.exitCode = 1 }
finally { await client?.end().catch(() => {}) }
