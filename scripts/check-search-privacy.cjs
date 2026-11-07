require('tsx/cjs')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const next = require('next/server')
const marker = 'SYNTHETIC_PRIVATE_NAME_DIAGNOSIS_PHONE'
let doctor = { id: 'doctor-a' }, queries = 0
const messages = []
const fail = async () => { queries++; throw new Error(marker) }
const prisma = {
  patient: { findMany: fail, findFirst: fail, create: fail, update: fail },
  prescription: { findFirst: fail, updateMany: fail }, visit: { create: fail },
  rxDraft: { findUnique: fail, upsert: fail, deleteMany: fail },
  diseaseTemplate: { findMany: fail, create: fail, update: fail, delete: fail }, $queryRaw: fail,
}
prisma.$transaction = async operation => operation(prisma)
const mocks = {
  'next/server': next, 'next/cache': { revalidatePath() {} },
  './auth.actions': { getCurrentDoctor: async () => doctor },
  '@/lib/prisma': { default: prisma },
  '@/lib/security/audit': { recordAudit: fail },
  '@/lib/security/rate-limit': { consumeRateLimit: async () => true },
  '@/lib/supabase/server': { createClient: async () => ({ storage: { from: () => ({ upload: fail }) } }) },
}
function load(file) {
  const exported = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports: exported, require: name => mocks[name] || require(name), Buffer, File, Date, Error,
    console: { error: (...args) => messages.push(args), log: (...args) => messages.push(args), warn: (...args) => messages.push(args) } })
  return exported
}
;(async () => {
  const patient = load('actions/patients.actions.ts')
  const rx = load('actions/prescriptions.actions.ts')
  const drafts = load('actions/drafts.actions.ts')
  const templates = load('actions/templates.actions.ts')
  const notes = load('actions/handwriting.actions.ts')
  const draft = { patientId: 'patient-a', diagnosis: marker, notes: marker, medicines: [], templateId: null, visit: { weightKg: '', bloodPressure: '', temperatureC: '', spo2: '' }, handwriting: { strokes: [], photoId: null } }
  const input = { patientId: 'patient-a', diagnosis: marker, notes: marker, medicines: [] }
  const file = new FormData()
  file.set('photo', new File([new Uint8Array([255, 216, 255, 217])], 'fixture.jpg', { type: 'image/jpeg' }))
  const cases = [
    () => patient.getPatients(marker), () => patient.getPatient('patient-a'), () => patient.getPatientForEdit('patient-a'),
    () => patient.createPatient({ name: marker }), () => patient.updatePatient('patient-a', { name: marker }),
    () => patient.findDuplicatePatients(marker, '1234567890'), () => patient.getPrescriptionPatients(marker),
    () => rx.createPrescription(input), () => rx.getPrescriptionForDuplicate('rx-a'),
    () => drafts.getRxDraft('fixture'), () => drafts.saveRxDraft('fixture', draft), () => drafts.deleteRxDraft('fixture'),
    () => templates.getTemplates(), () => templates.createTemplate({ name: marker, medicines: [] }),
    () => templates.updateTemplate('t-a', { name: marker, medicines: [] }), () => templates.deleteTemplate('t-a'), () => templates.seedDefaultTemplates(),
    () => notes.getPrescriptionNotes('rx-a'), () => notes.updatePrescriptionNotes({ id: 'rx-a', expectedUpdatedAt: '2026-11-07T00:00:00.000Z', notes: marker, handwriting: draft.handwriting }),
    () => notes.uploadHandwritingPhoto(file),
  ]
  for (const operation of cases) await assert.rejects(operation(), error => {
    assert.match(error.message, /request unavailable/)
    assert.equal(error.cause, undefined)
    assert.equal(String(error.stack).includes(marker), false)
    return true
  })
  assert.equal(queries >= cases.length, true, 'exercise database/SDK failure, not just invalid input')
  assert.deepEqual(messages, [], 'no original errors logged')
  doctor = null
  await assert.rejects(patient.getPatients(marker), /Unauthorized/)
  doctor = { id: 'doctor-a' }
  mocks['@/actions/patients.actions'] = patient
  for (const path of ['app/api/patients/route.ts', 'app/api/patients/duplicates/route.ts']) {
    const route = load(path)
    assert.equal(route.GET, undefined, 'legacy GET must not be exported')
    const body = path.includes('duplicates') ? { name: marker, phone: '1234567890' } : { q: marker }
    const request = data => new Request('https://fixture.invalid/api/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    const response = await route.POST(request(body))
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
    assert.equal((await response.text()).includes(marker), false)
    doctor = null
    assert.equal((await route.POST(request(body))).status, 401)
    doctor = { id: 'doctor-a' }
    const before = queries
    assert.equal((await route.POST(request({ q: 'x'.repeat(101) }))).status, 400)
    assert.equal(queries, before)
  }
  console.log(`PASS: ${cases.length} real data-action boundaries redact synthetic private exceptions; POST-only search, input limits and unauthorized denial`)
})().catch(error => { console.error(error); process.exitCode = 1 })
