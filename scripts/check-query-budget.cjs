require('tsx/cjs')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const access = require('../lib/auth/doctor-access.ts')
const patientSchema = require('../lib/validations/patient.schema.ts')
let requestMemo = new Map(), authCalls = 0, doctorCalls = 0, patientCalls = 0, query
let user = { id: 'auth-a', email: 'a@example.invalid', email_confirmed_at: 'fixture' }
let doctor = { active: true, id: 'doctor-a', supabaseId: 'auth-a', email: 'a@example.invalid' }
const old = process.env.ALLOWED_DOCTOR_EMAILS
const prisma = {
  doctor: { findUnique: async () => { doctorCalls++; return doctor } },
  patient: {
    findMany: async args => { patientCalls++; query = args; return [] },
    findFirst: async args => { patientCalls++; query = args; return { id: 'patient-a' } },
    update: async args => { patientCalls++; query = args; return { id: 'patient-a' } },
  },
}
prisma.$transaction = async callback => callback(prisma)
const mocks = {
  '@/lib/security/audit': { recordAudit: async () => {} },
  '@/lib/security/rate-limit': { consumeRateLimit: async () => true },
  '@/lib/validations/profile.schema': require('../lib/validations/profile.schema.ts'),
  react: { cache: fn => (...args) => { if (!requestMemo.has(fn)) requestMemo.set(fn, fn(...args)); return requestMemo.get(fn) } },
  '@/lib/prisma': { default: prisma },
  '@/lib/auth/doctor-access': access,
  '@/lib/validations/patient.schema': patientSchema,
  '@/lib/prescription-patient': require('../lib/prescription-patient.ts'),
  '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => { authCalls++; return { data: { user }, error: null } } } }) },
  'next/navigation': { redirect() {} },
  'next/cache': { revalidatePath() {} },
}
function load(path) {
  const exported = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports: exported, require: name => mocks[name] || require(name), console })
  return exported
}
;(async () => {
  process.env.ALLOWED_DOCTOR_EMAILS = 'a@example.invalid,b@example.invalid'
  const auth = load('actions/auth.actions.ts')
  mocks['./auth.actions'] = auth
  const patients = load('actions/patients.actions.ts')
  await Promise.all([auth.getCurrentDoctor(), patients.getPatients(), auth.getCurrentDoctor()])
  assert.equal(authCalls, 1)
  assert.equal(doctorCalls, 1)
  assert.equal(patientCalls, 1)
  assert.deepEqual(Object.keys(query.select).sort(), ['id', 'name', 'phone', 'visits'])
  assert.deepEqual(Object.keys(query.select.visits.select), ['date'])
  await patients.getPatient('patient-a')
  assert.equal(query.where.doctorId, doctor.id)
  assert.equal(query.include.prescriptions, undefined)
  assert.deepEqual(Object.keys(query.include.visits.include.prescriptions.select).sort(), ['createdAt', 'id'])
  const before = patientCalls
  await patients.updatePatient('patient-a', { name: 'Synthetic Patient' })
  assert.equal(patientCalls, before + 1)
  assert.equal(query.where.doctorId, doctor.id)
  requestMemo = new Map()
  user = { id: 'auth-b', email: 'b@example.invalid', email_confirmed_at: 'fixture' }
  doctor = { active: true, id: 'doctor-b', supabaseId: 'auth-b', email: 'b@example.invalid' }
  assert.equal((await auth.getCurrentDoctor()).id, 'doctor-b')
  assert.equal(doctorCalls, 2)
  console.log('PASS: request-local doctor deduplication, doctor isolation, lightweight directory/history and one-write patient updates')
})().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => { if (old === undefined) delete process.env.ALLOWED_DOCTOR_EMAILS; else process.env.ALLOWED_DOCTOR_EMAILS = old })
