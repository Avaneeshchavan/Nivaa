require('tsx/cjs')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const { handwritingSchema, parseHandwriting, strokePath } = require('../lib/validations/handwriting.schema.ts')
const { rxDraftSchema } = require('../lib/validations/draft.schema.ts')
const { prescriptionSchema } = require('../lib/validations/prescription.schema.ts')
const doctor = { id: 'doctor-a', supabaseId: '11111111-1111-4111-8111-111111111111' }
let currentDoctor = doctor, query, writes = 0, uploads = 0, storedPath, updatedAt = '2026-11-07T10:00:00.000Z'
const handwriting = { strokes: [[[0, 0], [500, 300], [1000, 600]]], photoId: null }
const mocks = {
  '@/actions/auth.actions': { getCurrentDoctor: async () => currentDoctor },
  './auth.actions': { getCurrentDoctor: async () => currentDoctor },
  '@/lib/validations/prescription.schema': require('../lib/validations/prescription.schema.ts'),
  '@/lib/validations/handwriting.schema': { handwritingSchema },
  'next/cache': { revalidatePath() {} },
  '@/lib/supabase/server': { createClient: async () => ({ storage: { from: bucket => {
    assert.equal(bucket, 'prescription-notes')
    return { upload: async (path, bytes, options) => { uploads++; storedPath = path; assert.equal(options.upsert, false); return { error: null } } }
  } } }) },
  '@/lib/prisma': { default: {
    patient: { findFirst: async ({ where }) => where.id === 'patient-a' && where.doctorId === doctor.id ? { id: 'patient-a' } : null },
    visit: { create: async args => {
      assert.equal(args.data.doctorId, doctor.id)
      assert.equal(args.data.prescriptions.create.handwriting.strokes.length, 1)
      assert.equal(args.select.prescriptions.select.id, true)
      return { prescriptions: [{ id: 'rx-a' }] }
    } },
    prescription: {
    findFirst: async args => { query = args; return args.where.id === 'rx-a' ? { id: 'rx-a' } : null },
    updateMany: async args => {
      writes++
      query = args
      assert.equal(args.where.doctorId, currentDoctor.id)
      assert.equal(args.where.patient.doctorId, currentDoctor.id)
      assert.deepEqual(Object.keys(args.data).sort(), ['handwriting', 'notes'])
      const matches = currentDoctor.id === doctor.id && args.where.id === 'rx-a' && args.where.updatedAt.toISOString() === updatedAt
      if (matches) updatedAt = '2026-11-07T10:01:00.000Z'
      return { count: matches ? 1 : 0 }
    },
  } } },
}
const exported = {}
function loadAction(file, result) {
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: result, require: name => mocks[name] || require(name), Buffer, File, Date })
}
loadAction('actions/handwriting.actions.ts', exported)
const rxActions = {}
loadAction('actions/prescriptions.actions.ts', rxActions)
;(async () => {
  assert.deepEqual(parseHandwriting(null), { strokes: [], photoId: null })
  assert.equal(handwritingSchema.safeParse(handwriting).success, true)
  for (const value of [
    { ...handwriting, photoId: '../../foreign-file' },
    { ...handwriting, photoId: 'https://untrusted.invalid/file.jpg' },
    { ...handwriting, strokes: [[[Infinity, 0]]] },
    { ...handwriting, strokes: [[[-1, 0]]] },
    { ...handwriting, strokes: Array(201).fill([[1, 1]]) },
    { ...handwriting, strokes: Array(11).fill(Array(1500).fill([1, 1])) },
  ]) assert.equal(handwritingSchema.safeParse(value).success, false)
  assert.match(strokePath([[10, 10]]), /^M10 10 L/)
  const legacy = { patientId: 'patient-a', diagnosis: '', medicines: [], notes: '' }
  assert.deepEqual(prescriptionSchema.parse(legacy).handwriting, { strokes: [], photoId: null })
  assert.deepEqual(rxDraftSchema.parse({ ...legacy, templateId: null, visit: { weightKg: '', bloodPressure: '', temperatureC: '', spo2: '' } }).handwriting, { strokes: [], photoId: null })
  assert.equal((await rxActions.createPrescription({ ...legacy, handwriting })).id, 'rx-a')
  await assert.rejects(rxActions.createPrescription({ ...legacy, patientId: 'foreign', handwriting }), /Patient not found/)
  await exported.getPrescriptionNotes('rx-a')
  assert.equal(query.where.doctorId, doctor.id)
  assert.equal(query.where.patient.doctorId, doctor.id)
  const input = { id: 'rx-a', expectedUpdatedAt: updatedAt, notes: 'Synthetic note', handwriting }
  assert.equal((await exported.updatePrescriptionNotes(input)).success, true)
  assert.equal((await exported.updatePrescriptionNotes(input)).success, false, 'stale write must fail')
  currentDoctor = { ...doctor, id: 'doctor-b' }
  assert.equal((await exported.updatePrescriptionNotes({ ...input, expectedUpdatedAt: updatedAt })).success, false)
  const before = writes
  await assert.rejects(exported.updatePrescriptionNotes({ ...input, handwriting: { ...handwriting, photoId: '../foreign' } }))
  assert.equal(writes, before)
  currentDoctor = doctor
  const bad = new FormData()
  bad.set('photo', new File(['<svg/>'], 'bad.jpg', { type: 'image/jpeg' }))
  await assert.rejects(exported.uploadHandwritingPhoto(bad), /Invalid JPEG/)
  assert.equal(uploads, 0)
  const valid = new FormData()
  valid.set('photo', new File([new Uint8Array([255, 216, 255, 217])], 'fixture.jpg', { type: 'image/jpeg' }))
  const photoId = await exported.uploadHandwritingPhoto(valid)
  assert.equal(storedPath, `${doctor.supabaseId}/${photoId}.jpg`)
  currentDoctor = null
  await assert.rejects(exported.getPrescriptionNotes('rx-a'), /Unauthorized/)
  await assert.rejects(exported.updatePrescriptionNotes(input), /Unauthorized/)
  await assert.rejects(exported.uploadHandwritingPhoto(valid), /Unauthorized/)
  assert.equal(uploads, 1)
  console.log('PASS: legacy Rx/drafts, bounded handwriting, scoped notes/photos, concurrent edits, invalid uploads, anonymous denial')
})().catch(error => { console.error(error); process.exitCode = 1 })
