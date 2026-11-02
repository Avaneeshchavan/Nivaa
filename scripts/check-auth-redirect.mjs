import assert from 'node:assert/strict'

// Run against a running app: node scripts/check-auth-redirect.mjs http://localhost:3000
const baseUrl = process.argv[2] || 'http://localhost:3000'
for (const path of ['/settings', '/patients', '/prescriptions', '/templates', '/api/medicines', '/future-route', '/patients/example.svg', '/api/authentic']) {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: 'manual',
    // Node fetch has no cookie jar; each request is unauthenticated.
    signal: AbortSignal.timeout(15_000),
  })
  assert.equal(response.status, 307, `${path}: expected a temporary redirect`)
  const location = response.headers.get('location')
  assert.ok(location, `${path}: missing Location header`)
  assert.equal(new URL(location, baseUrl).pathname, '/login', `${path}: wrong redirect`)
  console.log(`PASS ${path} -> /login (no cookies)`)
}
