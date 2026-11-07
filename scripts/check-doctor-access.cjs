require('tsx/cjs')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const access = require('../lib/auth/doctor-access.ts')
const old = process.env.ALLOWED_DOCTOR_EMAILS
let user, doctor, authCalls = 0, dbCalls = 0, signouts = 0, passwordError = null, auditFailure = false
const mocks = {
  '@/lib/security/audit': { recordAudit: async () => { if (auditFailure) throw new Error('audit unavailable') } },
  '@/lib/security/rate-limit': { consumeRateLimit: async () => true },
  '@/lib/validations/profile.schema': require('../lib/validations/profile.schema.ts'),
  '@/lib/auth/doctor-access': access,
  '@/lib/supabase/server': { createClient: async () => ({ auth: {
    getUser: async () => ({ data: { user }, error: null }),
    signInWithPassword: async () => { authCalls++; return { error: passwordError } },
    signOut: async () => { signouts++ },
  } }) },
  '@/lib/prisma': { default: { doctor: { findUnique: async () => { dbCalls++; return doctor } } } },
  'next/navigation': { redirect: () => { throw new Error('redirect') } },
}
const exported = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('actions/auth.actions.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
  { exports: exported, require: name => mocks[name] || require(name), console })
;(async () => {
  for (const config of ['', 'a@example.invalid', 'a@example.invalid,a@example.invalid', 'a@example.invalid,b@example.invalid,c@example.invalid', 'bad,b@example.invalid']) {
    process.env.ALLOWED_DOCTOR_EMAILS = config
    assert.equal(access.isAllowedDoctorEmail('a@example.invalid'), false)
  }
  process.env.ALLOWED_DOCTOR_EMAILS = ' A@EXAMPLE.INVALID , b@example.invalid '
  assert.equal(access.isAllowedDoctorEmail('a@example.invalid'), true)
  assert.equal(access.isAllowedDoctorEmail('b@example.invalid'), true)
  assert.equal(access.isAllowedDoctorEmail('a+alias@example.invalid'), false)
  user = { id: 'a', email: 'a@example.invalid', email_confirmed_at: 'fixture' }
  doctor = { active: true, id: 'doctor-a', email: 'A@example.invalid', supabaseId: 'a' }
  assert.equal((await exported.getCurrentDoctor()).id, 'doctor-a')
  assert.equal((await exported.signIn({email:'a@example.invalid',password:'fixture-password'})).error, null)
  user = { id: 'b', email: 'b@example.invalid', email_confirmed_at: 'fixture' }
  doctor = { active: true, id: 'doctor-b', email: 'b@example.invalid', supabaseId: 'b' }
  assert.equal((await exported.getCurrentDoctor()).id, 'doctor-b')
  doctor = { ...doctor, email: 'other@example.invalid' }
  assert.equal(await exported.getCurrentDoctor(), null)
  doctor = null
  assert.ok((await exported.signIn({email:'b@example.invalid',password:'fixture-password'})).error)
  assert.equal(signouts, 1)
  for (const candidate of [null, {id:'third', email:'other@example.invalid',email_confirmed_at:'fixture'}, {id:'a',email:'a@example.invalid'}]) {
    user = candidate
    const before = dbCalls
    assert.equal(await exported.getCurrentDoctor(), null)
    assert.equal(dbCalls, before)
  }
  const before = authCalls
  assert.ok((await exported.signIn({email:'other@example.invalid',password:'fixture-password'})).error)
  assert.ok((await exported.signIn({email:'invalid',password:''})).error)
  assert.equal(authCalls, before)
  passwordError = { message: 'sensitive provider error' }
  assert.ok(!(await exported.signIn({email:'a@example.invalid',password:'fixture-password'})).error.includes('sensitive'))
  const middlewareExports = {}
  const next = require('next/server')
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('middleware.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports: middlewareExports, process,
    require: name => name === '@supabase/ssr' ? { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) } : name === '@/lib/auth/doctor-access' ? access : require(name),
  })
  const request = () => new next.NextRequest('https://fixture.invalid/settings?q=synthetic')
  for (const email of ['a@example.invalid', 'b@example.invalid']) {
    user = { email, email_confirmed_at: 'fixture' }
    assert.equal((await middlewareExports.middleware(request())).status, 200)
  }
  for (const identity of [null, {email:'other@example.invalid',email_confirmed_at:'fixture'}, {email:'a@example.invalid'}]) {
    user = identity
    const result = await middlewareExports.middleware(request())
    assert.equal(result.status, 307)
    assert.equal(result.headers.get('location'), 'https://fixture.invalid/login')
  }
  delete process.env.ALLOWED_DOCTOR_EMAILS
  user = {email:'a@example.invalid',email_confirmed_at:'fixture'}
  assert.equal((await middlewareExports.middleware(request())).status, 307)
  assert.equal((await middlewareExports.middleware(new next.NextRequest('https://fixture.invalid/login'))).status, 200)
  process.env.ALLOWED_DOCTOR_EMAILS = 'a@example.invalid,b@example.invalid'
  user = { id: 'a', email: 'a@example.invalid', email_confirmed_at: 'fixture' }
  doctor = { active: true, id: 'doctor-a', supabaseId: 'a', email: 'a@example.invalid' }
  passwordError = null
  auditFailure = true
  const previousSignouts = signouts
  assert.ok((await exported.signIn({ email: 'a@example.invalid', password: 'fixture-password' })).error)
  assert.equal(signouts, previousSignouts + 1)
  console.log('PASS: exactly two identities, malformed config denied, confirmed email and Doctor mapping required, generic login errors and session cleanup')
})().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => {
  if (old === undefined) delete process.env.ALLOWED_DOCTOR_EMAILS
  else process.env.ALLOWED_DOCTOR_EMAILS = old
})
