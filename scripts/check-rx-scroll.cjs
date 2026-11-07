require('tsx/cjs')
const assert = require('node:assert/strict')
const { reserveScrollSpace } = require('../lib/prescriptions/scroll-reservation.ts')
let resize, disconnected = false, height = 80
const properties = new Map()
const container = { style: {
  getPropertyValue: key => properties.get(key) || '',
  setProperty: (key, value) => properties.set(key, value),
  removeProperty: key => properties.delete(key),
} }
const element = { closest: selector => { assert.equal(selector, '#main-content'); return container }, getBoundingClientRect: () => ({ height }) }
global.ResizeObserver = class {
  constructor(callback) { resize = callback }
  observe(target) { assert.equal(target, element) }
  disconnect() { disconnected = true }
}
const cleanup = reserveScrollSpace(element, '--rx-action-bar-height')
assert.equal(properties.get('--rx-action-bar-height'), '80px')
// Wrapped buttons, validation messages, and text zoom change rendered height.
for (height of [144, 208.5, 72]) {
  resize()
  assert.equal(properties.get('--rx-action-bar-height'), `${Math.ceil(height)}px`)
}
cleanup()
assert.equal(disconnected, true)
assert.equal(properties.has('--rx-action-bar-height'), false)
properties.set('--rx-action-bar-height', '96px')
reserveScrollSpace(element, '--rx-action-bar-height')()
assert.equal(properties.get('--rx-action-bar-height'), '96px')
reserveScrollSpace({ closest: () => null }, '--rx-action-bar-height')()
console.log('PASS: rendered height, resize, wrapped bar, cleanup, previous styles, missing container')
