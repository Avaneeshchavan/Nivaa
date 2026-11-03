require('tsx/cjs')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const vm = require('node:vm')
const schema = require('../lib/validations/draft.schema.ts')
const rows = new Map()
let doctor = { id: 'a' }
const keyOf = where => `${where.doctorId}:${where.key}`
const prisma = {
  patient: { findFirst: async ({ where }) => where.id === `patient-${where.doctorId}` ? { id: where.id } : null },
  rxDraft: {
    findUnique: async ({ where }) => rows.get(keyOf(where.doctorId_key)) || null,
    upsert: async ({ where, create, update }) => { const key = keyOf(where.doctorId_key); rows.set(key, rows.has(key) ? { ...rows.get(key), ...update } : create) },
    deleteMany: async ({ where }) => rows.delete(keyOf(where)),
  },
}
const mocks = { '@/lib/prisma': { default: prisma }, './auth.actions': { getCurrentDoctor: async () => doctor }, '@/lib/validations/draft.schema': schema }
const exported = {}
const source = fs.readFileSync('actions/drafts.actions.ts', 'utf8')
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
  { exports: exported, require: name => mocks[name] || require(name) })
const draft = { patientId: 'patient-a', diagnosis: 'Synthetic', medicines: [], notes: '', templateId: null, visit: { weightKg: '', bloodPressure: '', temperatureC: '', spo2: '' } }
;(async () => {
  await exported.saveRxDraft('new', draft)
  assert.equal((await exported.getRxDraft('new')).diagnosis, 'Synthetic')
  doctor = { id: 'b' }
  assert.equal(await exported.getRxDraft('new'), null)
  await assert.rejects(exported.saveRxDraft('new', draft), /Patient unavailable/)
  await exported.saveRxDraft('new', { ...draft, patientId: 'patient-b' })
  await exported.deleteRxDraft('new')
  assert.equal(rows.size, 1)
  doctor = { id: 'a' }
  await assert.rejects(exported.saveRxDraft('new', { ...draft, medicines: Array(101).fill({}) }))
  await exported.deleteRxDraft('new')
  assert.equal(rows.size, 0)
  doctor = null
  await assert.rejects(exported.getRxDraft('new'), /Unauthorized/)
  await assert.rejects(exported.saveRxDraft('new', draft), /Unauthorized/)
  await assert.rejects(exported.deleteRxDraft('new'), /Unauthorized/)
  console.log('PASS: actual draft actions authorize reads/writes/deletion, validate payloads and isolate doctors')
})().catch(error => { console.error(error); process.exitCode = 1 })
