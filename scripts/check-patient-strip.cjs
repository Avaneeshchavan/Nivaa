require('tsx/cjs')
const assert = require('node:assert/strict')
const React = require('react')
global.React = React // tsx honors this repository's jsx:preserve setting outside Next.
const { renderToStaticMarkup } = require('react-dom/server')
const { patientAge } = require('../lib/prescriptions/patient-age.ts')
const PatientStrip = require('../components/prescriptions/PatientStrip.tsx').default
for (const [dob, now, expected] of [
  ['2006-07-09', '2026-07-08T12:00:00Z', 19], ['2006-07-09', '2026-07-09T12:00:00Z', 20],
  ['2006-07-09', '2026-07-08T18:30:00Z', 20], // midnight in India, still July 8 UTC
  ['2024-02-29', '2025-02-28T12:00:00Z', 0], ['2024-02-29', '2025-03-01T12:00:00Z', 1],
  ['2027-01-01', '2026-11-07T12:00:00Z', null], [null, '2026-11-07T12:00:00Z', null],
  ['invalid', '2026-11-07T12:00:00Z', null],
]) assert.equal(patientAge(dob, new Date(now)), expected)
const patient = { id: 'p', name: 'Synthetic patient '.repeat(8), dob: new Date('2000-01-01'), gender: 'FEMALE', allergies: 'Synthetic allergy '.repeat(80), phone: null }
const markup = renderToStaticMarkup(React.createElement(PatientStrip, { patient }))
assert.match(markup, /Current prescription patient/)
assert.match(markup, /Female/)
assert.match(markup, /Read allergies/)
assert.match(markup, /line-clamp-2/)
assert.match(markup, /break-words/)
assert.equal(markup.includes(patient.name), true)
assert.equal(markup.includes(patient.allergies.trim()), true)
const unknown = renderToStaticMarkup(React.createElement(PatientStrip, { patient: { ...patient, dob: null, gender: null, allergies: null } }))
assert.match(unknown, /Age not recorded/)
assert.match(unknown, /Sex not recorded/)
assert.match(unknown, /Allergies not recorded/)
assert.doesNotMatch(unknown, /No allergies/)
assert.match(renderToStaticMarkup(React.createElement(PatientStrip)), /Select a patient/)
console.log('PASS: birthday/leap-year/India-day ages, missing demographics, allergy status, long text and accessible detail control')
