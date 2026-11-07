require('tsx/cjs')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const { PGlite } = require('@electric-sql/pglite')
const schema = require('../lib/validations/custom-medicine.schema.ts')
const catalog = require('../lib/medicines/catalog.ts')
const migration = fs.readFileSync('prisma/migrations/202611070005_custom_medicine_identity/migration.sql', 'utf8')
const table = `CREATE TABLE "Medicine" (id text PRIMARY KEY, name text NOT NULL, system text DEFAULT 'ALLOPATHY', generic text, form text, "createdAt" timestamp DEFAULT now(), "updatedAt" timestamp NOT NULL)`
const db = new PGlite()
let doctor = { id: 'doctor-a' }, calls = 0, fail = false
const prisma = { $queryRaw: async (strings, ...values) => {
  calls++
  if (fail) throw new Error('Synthetic private database arguments must never escape')
  const sql = strings.reduce((result, part, index) => result + (index ? `$${index}` : '') + part, '')
  return (await db.query(sql, values)).rows
} }
const mocks = {
  '@/lib/prisma': { default: prisma }, './auth.actions': { getCurrentDoctor: async () => doctor },
  '@/lib/medicines/catalog': catalog, '@/lib/validations/custom-medicine.schema': schema,
}
const exported = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('actions/medicines.actions.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: exported, require: name => mocks[name] || require(name) })
;(async () => {
  await db.exec(table)
  const fixtures = [...require('../prisma/medicine-catalog.ts').medicineCatalog, ...require('../prisma/ayurvedic-catalog.ts').ayurvedicCatalog]
  for (const [index, medicine] of fixtures.entries()) await db.query('INSERT INTO "Medicine" (id,name,form,system,"updatedAt") VALUES ($1,$2,$3,$4,now())', [`legacy-${index}`, medicine.name, medicine.form, medicine.system || 'ALLOPATHY'])
  await db.exec(migration)
  assert.equal((await db.query('SELECT count(*) FROM "Medicine"')).rows[0].count, fixtures.length, 'migration preserves catalog')
  const create = exported.createCustomMedicine
  const input = { name: '  Synthetic   Brand ', strength: ' 4   mg ', form: 'tablet', manufacturer: ' Fixture   Company ', generic: ' Synthetic   Composition ' }
  const first = await create(input)
  assert.equal(first.alreadyExists, false)
  assert.equal(first.medicine.name, 'Synthetic Brand 4 mg')
  assert.equal(first.medicine.manufacturer, 'Fixture Company')
  assert.equal(first.medicine.generic, 'Synthetic Composition')
  for (const name of ['synthetic brand', 'SYNTHETIC-BRAND', 'Ｓｙｎｔｈｅｔｉｃ Brand', 'Synthetic—Brand']) {
    const duplicate = await create({ ...input, name, manufacturer: 'Must not overwrite' })
    assert.equal(duplicate.alreadyExists, true)
    assert.equal(duplicate.medicine.id, first.medicine.id)
    assert.equal(duplicate.medicine.manufacturer, 'Fixture Company')
  }
  const legacy = await create({ name: 'paracetamol', strength: '500 mg', form: 'tablet' })
  assert.equal(legacy.alreadyExists, true)
  assert.match(legacy.medicine.id, /^legacy-/)
  for (const variation of [{ strength: '8 mg' }, { form: 'capsule' }]) assert.equal((await create({ ...input, ...variation })).alreadyExists, false)
  const concurrent = await Promise.all(Array.from({ length: 8 }, () => create({ name: 'Concurrent fixture', form: 'other', system: 'AYURVEDIC' })))
  assert.equal(new Set(concurrent.map(result => result.medicine.id)).size, 1)
  assert.equal(concurrent.filter(result => !result.alreadyExists).length, 1)
  assert.equal(concurrent[0].medicine.system, 'AYURVEDIC')
  const before = calls
  for (const invalid of [{ ...input, name: ' ' }, { ...input, form: 'bad' }, { ...input, name: 'x'.repeat(160), strength: 'x'.repeat(80) }, { ...input, manufacturer: 'x'.repeat(161) }]) await assert.rejects(create(invalid), /Check the medicine/)
  doctor = null
  await assert.rejects(create(input), /Unauthorized/)
  assert.equal(calls, before)
  doctor = { id: 'doctor-a' }
  fail = true
  await assert.rejects(create(input), error => error.message === 'Could not save the medicine. Try again.' && !error.cause)
  // Existing collisions must abort the whole additive migration, without deleting data.
  const conflict = new PGlite()
  try {
    await conflict.exec(table)
    await conflict.exec(`INSERT INTO "Medicine" (id,name,form,"updatedAt") VALUES ('a','A-B','Tablet',now()),('b','a b','tablet',now())`)
    await assert.rejects(conflict.exec(migration), /duplicates require review/)
    await conflict.exec('ROLLBACK')
    assert.equal((await conflict.query('SELECT count(*) FROM "Medicine"')).rows[0].count, 2)
    assert.equal((await conflict.query("SELECT column_name FROM information_schema.columns WHERE table_name='Medicine' AND column_name='manufacturer'")).rows.length, 0)
  } finally { await conflict.close() }
  console.log(`PASS: ${fixtures.length} legacy rows preserved; normalized duplicates, concurrent inserts, metadata, validation, auth denial, safe errors and migration rollback`)
})().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => db.close())
