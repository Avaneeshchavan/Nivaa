import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'

// Authenticated local HTTP benchmark. Do not print or commit the session cookie.
const cookie = process.env.NIVAA_SESSION_COOKIE
assert.ok(cookie, 'Set NIVAA_SESSION_COOKIE to a signed-in doctor browser cookie header')
const base = process.env.NIVAA_BASE_URL || 'http://localhost:3000'
const queries = process.argv.slice(2)
assert.ok(queries.length, 'Pass representative name, phone, diagnosis and medicine queries')
const timings = []
for (const query of queries) {
  for (let sample = 0; sample < 12; sample++) {
    const start = performance.now()
    const response = await fetch(new URL('/api/patients', base), {
      method: 'POST', body: JSON.stringify({ q: query }),
      headers: { Cookie: cookie, 'Content-Type': 'application/json' }, redirect: 'manual', signal: AbortSignal.timeout(10000),
    })
    assert.equal(response.status, 200, 'Search must succeed with a doctor session')
    const results = await response.json()
    assert.ok(Array.isArray(results) && results.length <= 50)
    if (sample > 1) timings.push(performance.now() - start)
  }
}
timings.sort((a, b) => a - b)
const p95 = timings[Math.ceil(timings.length * .95) - 1]
console.log(`Local HTTP search p95: ${p95.toFixed(1)} ms; excludes the 150ms typing debounce`)
assert.ok(p95 < 300, `Search exceeded the 300ms local HTTP target: ${p95.toFixed(1)} ms`)
