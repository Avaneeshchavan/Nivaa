require('tsx/cjs')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const { PGlite } = require('@electric-sql/pglite')
const { readSmallJson } = require('../lib/security/request-json.ts')
const { patientSchema } = require('../lib/validations/patient.schema.ts')
const { templateSchema } = require('../lib/validations/template.schema.ts')
const { databaseConnection } = require('../lib/database-connection.ts')
const db = new PGlite()
const exported = {}
let doctor = { id: 'doctor-a' }
let audited = []
const query = async (strings, ...values) => (await db.query(strings.reduce((sql, part, index) => sql + (index ? `$${index}` : '') + part, ''), values)).rows
const templates = new Map()
const prisma = {
  $queryRaw: query,
  $transaction: async callback => callback(prisma),
  diseaseTemplate: {
    findMany: async ({ where }) => [...templates.values()].filter(row => row.doctorId === where.doctorId),
    create: async ({ data }) => { const row = { ...data, id: data.id || `template-${templates.size}` }; templates.set(row.id, row); return row },
    update: async ({ where, data }) => { const row = templates.get(where.id); if (!row || row.doctorId !== where.doctorId) throw new Error('Not found'); const updated = { ...row, ...data }; templates.set(row.id, updated); return updated },
    delete: async ({ where }) => { const row = templates.get(where.id); if (!row || row.doctorId !== where.doctorId) throw new Error('Not found'); templates.delete(row.id) },
  },
}
function load(file, result) {
  const mocks = { '@/lib/prisma': { default: prisma }, './auth.actions': { getCurrentDoctor: async () => doctor },
    '@/lib/security/audit': { recordAudit: async (...args) => { audited.push(args); assert.equal(args[3], prisma) } },
    '@/lib/validations/template.schema': { templateSchema }, '@/lib/templates/defaultTemplates': require('../lib/templates/defaultTemplates.ts'), 'next/cache': { revalidatePath() {} } }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports: result, require: name => mocks[name] || require(name) })
}
;(async () => {
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;')
  await db.exec(fs.readFileSync('prisma/migrations/202611070003_security_operations/migration.sql', 'utf8'))
  load('lib/security/rate-limit.ts', exported)
  const attempts = await Promise.all(Array.from({ length: 20 }, () => exported.consumeRateLimit('login', 'synthetic@example.invalid', 3, 600)))
  assert.equal(attempts.filter(Boolean).length, 3)
  assert.equal(await exported.consumeRateLimit('login', 'other@example.invalid', 3, 600), true)
  await db.exec('UPDATE "RateLimit" SET "windowStartedAt" = now() - interval \'601 seconds\'')
  assert.equal(await exported.consumeRateLimit('login', 'synthetic@example.invalid', 3, 600), true)
  const keys = (await db.query('SELECT key FROM "RateLimit"')).rows
  assert.ok(keys.every(row => /^[a-f0-9]{64}$/.test(row.key)))
  await db.exec(`INSERT INTO "AuditLog" (id,"doctorId",action) VALUES ('fixture','doctor-a','PATIENT_VIEW')`)
  for (const sql of ['UPDATE "AuditLog" SET action=\'changed\'', 'DELETE FROM "AuditLog"', 'TRUNCATE "AuditLog"']) await assert.rejects(db.exec(sql), /append-only/)
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`)
    for (const table of ['AuditLog', 'RateLimit']) await assert.rejects(db.query(`SELECT * FROM "${table}"`), error => error.code === '42501')
    await db.exec('RESET ROLE')
  }
  const actions = {}
  // Mock only the advisory lock for action-level catalog tests; the limiter above executes real SQL.
  prisma.$queryRaw = async () => []
  load('actions/templates.actions.ts', actions)
  await actions.seedDefaultTemplates()
  const count = templates.size
  const seeded = [...templates.values()][0]
  await actions.updateTemplate(seeded.id, { name: 'Renamed by doctor', diagnosis: 'Edited', medicines: [] })
  await actions.seedDefaultTemplates()
  assert.equal(templates.size, count)
  assert.equal(templates.get(seeded.id).name, 'Renamed by doctor')
  doctor = { id: 'doctor-b' }
  await assert.rejects(actions.updateTemplate(seeded.id, { name: 'Foreign edit', medicines: [] }), /Not found/)
  await assert.rejects(actions.deleteTemplate(seeded.id), /Not found/)
  await assert.rejects(actions.updateTemplate({ not: '' }, { name: 'Invalid id', medicines: [] }))
  const before = templates.size
  await assert.rejects(actions.createTemplate({ name: 'Invalid', medicines: [{ dosage: 'malformed' }] }))
  assert.equal(templates.size, before)
  doctor = null
  await assert.rejects(actions.getTemplates(), /Unauthorized/)
  assert.ok(audited.length > 0)
  assert.equal(patientSchema.safeParse({ name: 'Test', dob: '2026-02-31' }).success, false)
  assert.equal(patientSchema.safeParse({ name: 'Test', dob: '2999-01-01' }).success, false)
  assert.equal(templateSchema.safeParse({ name: 'x'.repeat(161), medicines: [] }).success, false)
  const connection = databaseConnection('postgresql://fixture:fixture@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=disable&sslaccept=accept_invalid_certs')
  assert.equal(connection.ssl.rejectUnauthorized, true)
  assert.equal(new URL(connection.connectionString).searchParams.has('sslmode'), false)
  assert.match(connection.ssl.ca, /BEGIN CERTIFICATE/)
  const request = text => new Request('https://fixture.invalid/api/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text })
  assert.deepEqual(await readSmallJson(request('{"q":"synthetic"}')), { q: 'synthetic' })
  await assert.rejects(readSmallJson(request('x'.repeat(4097))), /too large/)
  console.log('PASS: shared atomic rate budget/reset, private append-only audit, template ownership/idempotency, bounded inputs and search bodies')
})().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => db.close())
