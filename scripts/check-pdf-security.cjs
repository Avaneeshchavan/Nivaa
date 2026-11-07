const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const { Readable } = require('node:stream')
const ts = require('typescript')

// Execute the actual handler with synthetic auth/DB/Storage/render boundaries.
// Hosted JWT, Storage/CDN and real rendering still need deployment smoke tests.
const doctor = { id: 'doctor-a', supabaseId: '11111111-1111-4111-8111-111111111111' }
const fixture = { id: 'rx-a', doctorId: doctor.id, patientId: 'patient-a', patient: { doctorId: doctor.id }, visit: { doctorId: doctor.id, patientId: 'patient-a' } }
let currentDoctor, row, query, rendered, uploaded, uploadError, renderError, signed
class NextResponse extends Response {
  static redirect(url, status = 307) { return new NextResponse(null, { status, headers: { Location: url } }) }
  static json(body, options) { return Response.json(body, options) }
}
const mocks = {
  'next/server': { NextResponse },
  '@/actions/auth.actions': { getCurrentDoctor: async () => currentDoctor },
  '@/lib/prisma': { default: { prescription: { findFirst: async args => { query = args; return row } } } },
  '@/lib/handwriting-storage': { getHandwritingPhoto: async () => undefined },
  '@/lib/pdf-assets': { getPdfAssets: async () => ({}) },
  '@/lib/supabase/server': { createClient: async () => ({ storage: { from: bucket => {
    assert.equal(bucket, 'prescriptions')
    return { upload: async (...args) => { uploaded = args; return { error: uploadError } }, createSignedUrl: async (path, expiry) => { assert.equal(path, `${doctor.supabaseId}/rx-a-A5.pdf`); assert.equal(expiry, 60); return signed ? { data: { signedUrl: 'https://fixture.invalid/private?token=short-lived' }, error: null } : { data: null, error: {} } } }
  } } }) },
  '@react-pdf/renderer': { renderToStream: async () => { rendered = true; if (renderError) throw new Error('sensitive fixture detail'); return Readable.from([Buffer.from('%PDF-fixture')]) } },
  '@/components/prescriptions/RxPDFDocument': { default: () => null },
}
const source = fs.readFileSync('app/api/prescriptions/[id]/pdf/route.tsx', 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText
const exported = {}
const logs = []
vm.runInNewContext(code, { URL, exports: exported, require: name => mocks[name] || require(name), Buffer, console: { error: (...args) => logs.push(args) } })
async function run(user, prescription, status) {
  currentDoctor = user; row = prescription; query = undefined; rendered = false; uploaded = undefined
  const response = await exported.GET(new Request('http://localhost/api/prescriptions/rx-a/pdf'), { params: Promise.resolve({ id: 'rx-a' }) })
  assert.equal(response.status, status)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  if (status >= 400) { assert.equal(uploaded, undefined); assert.equal(rendered, status === 500) }
  return response
}
;(async () => {
  await run(null, fixture, 401); assert.equal(query, undefined)
  await run(doctor, null, 404)
  await run(doctor, { ...fixture, doctorId: 'doctor-b' }, 404)
  await run(doctor, { ...fixture, patient: { doctorId: 'doctor-b' } }, 404)
  await run(doctor, { ...fixture, visit: { doctorId: 'doctor-b', patientId: fixture.patientId } }, 404)
  await run(doctor, { ...fixture, visit: { doctorId: doctor.id, patientId: 'patient-b' } }, 404)
  const response = await run(doctor, fixture, 200)
  assert.equal(query.where.doctorId, doctor.id)
  assert.equal(query.where.patient.doctorId, doctor.id)
  assert.equal(uploaded[0], `${doctor.supabaseId}/rx-a-A5.pdf`)
  assert.equal(uploaded[2].cacheControl, '0')
  assert.equal(await response.text(), '%PDF-fixture')
  signed = true
  const redirect = await run(doctor, fixture, 307)
  assert.equal(redirect.headers.get('location'), 'https://fixture.invalid/private?token=short-lived')
  signed = false
  uploadError = { message: 'sensitive fixture detail' }
  await run(doctor, { ...fixture, visit: null }, 200)
  uploadError = null; renderError = true
  await run(doctor, fixture, 500)
  assert.ok(!JSON.stringify(logs).includes('sensitive fixture detail'))
  assert.ok(!source.includes('getPublicUrl'))
  console.log('PASS: actual PDF handler rejects anonymous/foreign/mismatched records, streams private responses and never issues public URLs')
})().catch(error => { console.error(error); process.exitCode = 1 })
