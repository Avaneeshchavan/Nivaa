require('tsx/cjs')
const assert = require('node:assert/strict')
const { rxSaveReason } = require('../lib/prescriptions/save-state.ts')
const state = { patientId: 'patient-a', diagnosis: '', medicines: [], notes: '', handwriting: { strokes: [], photoId: null }, visit: { weightKg: '', bloodPressure: '', temperatureC: '', spo2: '' }, saving: false, handwritingBusy: false }
assert.match(rxSaveReason({ ...state, patientId: null }), /Select a patient/)
assert.match(rxSaveReason(state), /Add a medicine, diagnosis, advice, or handwritten note/)
for (const content of [
  { diagnosis: 'Synthetic' }, { notes: 'Synthetic advice' },
  { handwriting: { strokes: [[[1, 1]]], photoId: null } },
  { medicines: [{ id: 'm', name: 'Synthetic medicine', dosage: '1 tablet', frequency: 'BD', duration: '5 days' }] },
]) assert.equal(rxSaveReason({ ...state, ...content }), null)
const filled = { ...state, notes: 'Synthetic' }
assert.match(rxSaveReason({ ...filled, visit: { ...state.visit, spo2: '101' } }), /measurements/)
assert.match(rxSaveReason({ ...filled, visit: { ...state.visit, bloodPressure: 'bad' } }), /measurements/)
assert.match(rxSaveReason({ ...filled, saving: true }), /Saving/)
assert.match(rxSaveReason({ ...filled, handwritingBusy: true }), /Finish/)
assert.match(rxSaveReason({ ...filled, notes: 'x'.repeat(8001) }), /notes and advice/)
assert.match(rxSaveReason({ ...filled, medicines: [{ id: 'm', name: '', dosage: '', frequency: '', duration: '' }] }), /medicine entries/)
console.log('PASS: save reasons match validation; diagnosis/advice/handwritten-only saves remain available')
