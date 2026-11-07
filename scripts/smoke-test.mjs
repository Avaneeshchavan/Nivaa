import assert from 'node:assert/strict'
const base = new URL(process.argv[2] || 'https://nivaa-kohl.vercel.app')
const request = (path, options = {}) => fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(20000), ...options })
const login = await request('/login')
assert.equal(login.status, 200, 'Login page must load')
assert.match(await login.text(), /Nivaa/)
assert.equal(login.headers.get('x-frame-options'), 'DENY')
assert.equal(login.headers.get('x-content-type-options'), 'nosniff')
assert.equal(login.headers.get('referrer-policy'), 'no-referrer')
assert.match(login.headers.get('content-security-policy') || '', /frame-ancestors 'none'/)
const paths = ['/patients', '/patients/new', '/templates', '/settings', '/prescriptions/new',
  '/prescriptions/synthetic/notes', '/api/medicines', '/api/clinic/print-assets',
  '/api/handwriting/11111111-1111-4111-8111-111111111111', '/api/prescriptions/synthetic/pdf', '/future-route', '/patients/example.svg']
for (const path of paths) {
  const response = await request(path)
  assert.equal(response.status, 307, 'Protected routes require sign-in')
  assert.equal(new URL(response.headers.get('location'), base).pathname, '/login')
}
for (const path of ['/api/patients', '/api/patients/duplicates']) {
  const response = await request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: 'synthetic', name: 'synthetic', phone: '9999999999' }) })
  assert.equal(response.status, 307)
  assert.equal(new URL(response.headers.get('location'), base).pathname, '/login')
}
console.log(`PASS ${paths.length + 3} public/anonymous smoke checks, including security headers and POST search protection`)
