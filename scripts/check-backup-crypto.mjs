import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { encryptArchive, decryptArchive } from './backup-crypto.mjs'
const work = await mkdtemp(join(tmpdir(), 'nivaa-backup-test-'))
const password = 'synthetic-only-backup-passphrase'
try {
  const source = join(work, 'source')
  const encrypted = join(work, 'encrypted')
  const restored = join(work, 'restored')
  const payload = Buffer.from('Synthetic test content. No patient data.')
  await writeFile(source, payload, { mode: 0o600 })
  await encryptArchive(source, encrypted, password)
  assert.equal((await readFile(encrypted)).includes(payload), false)
  assert.equal((await stat(encrypted)).mode & 0o777, 0o600)
  await assert.rejects(encryptArchive(source, encrypted, password))
  await decryptArchive(encrypted, restored, password)
  assert.deepEqual(await readFile(restored), payload)
  await assert.rejects(decryptArchive(encrypted, restored, password))
  assert.deepEqual(await readFile(restored), payload)
  await assert.rejects(decryptArchive(encrypted, join(work, 'wrong'), 'wrong-passphrase'))
  await assert.rejects(stat(join(work, 'wrong')))
  const corrupted = await readFile(encrypted)
  corrupted[60] ^= 1
  await writeFile(join(work, 'corrupted'), corrupted)
  await assert.rejects(decryptArchive(join(work, 'corrupted'), join(work, 'tampered'), password))
  await assert.rejects(stat(join(work, 'tampered')))
  console.log('PASS: encrypted backup round trip, restrictive permissions, wrong-password/tamper rejection, no output overwrite')
} finally { await rm(work, { recursive: true, force: true }) }
