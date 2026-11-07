import nextEnv from '@next/env'
import { createServer, connect } from 'node:net'
import { connect as connectTLS } from 'node:tls'
import { readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} })
const operation = process.argv[2] || 'status'
if (!['status', 'deploy'].includes(operation)) throw new Error('Use status or deploy')
if (!process.env.DIRECT_URL) throw new Error('Database configuration missing')
const remote = new URL(process.env.DIRECT_URL)
const ca = readFileSync('lib/security/supabase-ca.crt', 'utf8')
const sockets = new Set()
let tlsFailures = 0
// Prisma's native engine cannot load this provider's CA reliably on this machine.
// This temporary loopback bridge verifies TLS before forwarding ANY startup/auth data.
// Credentials stay in the child environment. External traffic always uses verified TLS.
const server = createServer(client => {
  sockets.add(client)
  const upstream = connect({ host: remote.hostname, port: Number(remote.port || 5432) })
  sockets.add(upstream)
  const fail = () => { tlsFailures++; client.destroy(); upstream.destroy() }
  client.on('error', () => upstream.destroy())
  client.on('close', () => { sockets.delete(client); upstream.destroy() })
  upstream.on('error', fail)
  upstream.on('close', () => { sockets.delete(upstream); client.destroy() })
  upstream.setTimeout(30000, fail)
  upstream.once('connect', () => {
    const sslRequest = Buffer.alloc(8)
    sslRequest.writeInt32BE(8, 0)
    sslRequest.writeInt32BE(80877103, 4)
    upstream.write(sslRequest)
  })
  upstream.once('data', data => {
    if (data.length !== 1 || data[0] !== 83) { fail(); return }
    const secured = connectTLS({ socket: upstream, servername: remote.hostname, ca, rejectUnauthorized: true, minVersion: 'TLSv1.2' })
    sockets.add(secured)
    secured.on('error', fail)
    secured.on('close', () => { sockets.delete(secured); client.destroy() })
    secured.once('secureConnect', () => {
      if (!secured.authorized) { fail(); return }
      client.pipe(secured).pipe(client)
    })
  })
})

try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const local = new URL(remote)
  local.hostname = '127.0.0.1'
  local.port = String(server.address().port)
  for (const key of ['sslrootcert', 'sslcert', 'sslkey', 'sslaccept']) local.searchParams.delete(key)
  local.searchParams.set('sslmode', 'disable') // Loopback only. The bridge above always verifies upstream TLS.
  const status = await new Promise((resolve, reject) => {
    const child = spawn('npx', ['prisma', 'migrate', operation], { env: { ...process.env, DIRECT_URL: local.toString() }, stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', code => resolve(code ?? 1))
  })
  if (tlsFailures) throw new Error('Verified migration TLS connection failed')
  process.exitCode = status
} catch { console.error('Migration failed. No TLS verification bypass was used.'); process.exitCode = 1 }
finally {
  for (const socket of sockets) socket.destroy()
  await new Promise(resolve => server.close(resolve))
}
