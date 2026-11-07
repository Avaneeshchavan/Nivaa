import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, rm, copyFile, cp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { encryptArchive, decryptArchive } from './backup-crypto.mjs'

process.umask(0o077)
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} })
const run = (command, args, env = process.env) => new Promise((resolveRun, reject) => {
  // Database tools can include credentials in errors. Keep their output private.
  const child = spawn(command, args, { env, stdio: 'ignore' })
  child.on('error', () => reject(new Error(`${command} unavailable`)))
  child.on('exit', code => code === 0 ? resolveRun() : reject(new Error(`${command} failed`)))
})
const safeParts = name => {
  const parts = name.split('/')
  if (parts.some(part => !part || part === '.' || part === '..' || /[\\\x00]/.test(part))) throw new Error('Unsafe storage name')
  return parts
}
const buckets = ['prescriptions', 'prescription-notes', 'signatures', 'logos']

async function main() {
  const password = process.env.NIVAA_BACKUP_PASSPHRASE
  if (!password || password.length < 20) throw new Error('Set NIVAA_BACKUP_PASSPHRASE to at least 20 characters')
  if (process.argv[2] === '--decrypt') {
    const [source, destination] = process.argv.slice(3)
    if (!source || !destination) throw new Error('Use --decrypt archive.nivaa new-output.tar')
    await decryptArchive(resolve(source), resolve(destination), password)
    console.log('Archive authenticated and decrypted. Protect the plaintext output.')
    return
  }
  if (!process.env.DIRECT_URL || !process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Database configuration missing')
  const databaseOnly = process.argv.includes('--database-only')
  if (!databaseOnly && !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Set SUPABASE_SERVICE_ROLE_KEY for a full database and Storage backup, or explicitly choose --database-only')
  const url = new URL(process.env.DIRECT_URL)
  const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGDATABASE: url.pathname.slice(1),
    PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: 'verify-full', PGSSLROOTCERT: resolve('lib/security/supabase-ca.crt') }
  const work = await mkdtemp(join(tmpdir(), 'nivaa-backup-'))
  try {
    await run('pg_dump', ['--format=custom', '--schema=public', '--no-owner', '--no-acl', '--file', join(work, 'database.dump')], env)
    // Catalog check catches truncated/invalid custom dumps before encryption.
    await run('pg_restore', ['--list', join(work, 'database.dump')])
    let storageObjects = 0
    if (!databaseOnly) {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
      for (const bucket of buckets) {
        const walk = async (prefix = '') => {
          for (let offset = 0; ; offset += 100) {
            const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } })
            if (error || !data) throw new Error('Storage listing failed')
            for (const item of data) {
              const name = prefix ? `${prefix}/${item.name}` : item.name
              const parts = safeParts(name)
              if (item.id === null) { await walk(name); continue }
              const { data: image, error: downloadError } = await supabase.storage.from(bucket).download(name)
              if (downloadError || !image) throw new Error('Storage download failed')
              const destination = join(work, 'storage', bucket, ...parts)
              await mkdir(join(work, 'storage', bucket, ...parts.slice(0, -1)), { recursive: true, mode: 0o700 })
              await writeFile(destination, Buffer.from(await image.arrayBuffer()), { flag: 'wx', mode: 0o600 })
              storageObjects++
            }
            if (data.length < 100) break
          }
        }
        await walk()
      }
    }
    await mkdir(join(work, 'schema'), { mode: 0o700 })
    await copyFile('prisma/schema.prisma', join(work, 'schema/schema.prisma'))
    await cp('prisma/migrations', join(work, 'schema/migrations'), { recursive: true })
    await writeFile(join(work, 'manifest.json'), JSON.stringify({ version: 1, createdAt: new Date().toISOString(), databaseOnly, storageObjects, buckets: databaseOnly ? [] : buckets }, null, 2), { mode: 0o600 })
    const archive = join(tmpdir(), `nivaa-${Date.now()}-${process.pid}.tar`)
    try {
      await run('tar', ['-cf', archive, '-C', work, '.'])
      const target = resolve(process.env.NIVAA_BACKUP_DIR || 'backups')
      await mkdir(target, { recursive: true, mode: 0o700 })
      const destination = join(target, `${new Date().toISOString().replace(/[:.]/g, '-')}${databaseOnly ? '-database-only' : '-full'}.nivaa`)
      await encryptArchive(archive, destination, password)
      console.log(`Encrypted ${databaseOnly ? 'database-only' : 'full'} backup completed. Storage objects ${storageObjects}.`)
    } finally { await rm(archive, { force: true }) }
  } finally { await rm(work, { force: true, recursive: true }) }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Backup failed'); process.exitCode = 1 })
