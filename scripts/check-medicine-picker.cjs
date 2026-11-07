require('tsx/cjs')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const schema = require('../lib/validations/custom-medicine.schema.ts')
function harness(file, mocks = {}) {
  let position = 0
  const state = []
  const exported = {}
  const hooks = { ...React,
    useState(initial) { const index = position++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value }] },
    useRef(initial) { const index = position++; return state[index] ||= { current: initial } },
    useId: () => 'custom-fixture',
    useEffect() {},
  }
  const aliases = {
    '@/actions/brand-preferences.actions': { rememberMedicineUse: async () => {}, setMedicineFavorite: async () => {} },
    react: hooks, 'use-debounce': { useDebouncedCallback: fn => fn },
    '@/components/ui/button': { Button: 'button' }, '@/components/ui/input': { Input: 'input' },
    '@/components/ui/command': Object.fromEntries(['Command', 'CommandGroup', 'CommandInput', 'CommandItem', 'CommandList'].map(key => [key, key])),
    '@/components/ui/select': Object.fromEntries(['Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue'].map(key => [key, key])),
    '@/stores/rxBuilderStore': { useRxBuilderStore: select => select({ addMedicine() {} }) },
    './CustomMedicineForm': { default: 'CustomMedicineForm' },
    '@/lib/validations/custom-medicine.schema': schema,
    ...mocks,
  }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports: exported, require: name => aliases[name] || require(name), crypto, AbortController, fetch: mocks.fetch })
  return props => { position = 0; return exported.default(props) }
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return []
  return [tree, ...React.Children.toArray(tree.props?.children).flatMap(nodes)]
}
const find = (tree, predicate) => nodes(tree).find(predicate)
const text = tree => typeof tree === 'string' || typeof tree === 'number' ? String(tree) : React.Children.toArray(tree?.props?.children).map(text).join('')
;(async () => {
  const medicine = { id: 'm', name: 'Synthetic brand', form: 'tablet', generic: 'Fixture composition', manufacturer: 'Fixture company', system: 'AYURVEDIC' }
  const requests = [], added = []
  const picker = harness('components/prescriptions/MedicineAutocomplete.tsx', { fetch: async url => { requests.push(url); return { ok: true, json: async () => [medicine] } } })
  let tree = picker({ onAdd: item => added.push(item) })
  const filters = nodes(tree).filter(node => node.type === 'button')
  assert.equal(filters[0].props['aria-pressed'], true, 'all systems default')
  assert.equal(filters.every(node => node.props.className.includes('min-h-11')), true)
  find(tree, node => node.type === 'CommandInput').props.onValueChange('Synthetic')
  await new Promise(setImmediate)
  assert.match(requests[0], /system=ALL/)
  tree = picker({ onAdd: item => added.push(item) })
  assert.match(text(tree), /AYUSH/)
  assert.match(text(tree), /Fixture company/)
  const custom = find(tree, node => node.type === 'CommandItem' && node.props.value === 'create-custom-medicine')
  custom.props.onSelect()
  tree = picker({ onAdd: item => added.push(item) })
  const form = find(tree, node => node.type === 'CustomMedicineForm')
  assert.equal(form.props.initialName, 'Synthetic')
  form.props.onCreated({ medicine, alreadyExists: true })
  tree = picker({ onAdd: item => added.push(item) })
  assert.match(text(tree), /Already exists: Synthetic brand/)
  assert.equal(find(tree, node => node.type === 'input' && node.props.id === 'rx-med-duration').props.value, '', 'no inferred AYUSH duration')
  // Complete the existing dosage stage and reuse the template editor's onAdd.
  find(tree, node => node.type === 'input' && node.props.id === 'rx-med-dosage').props.onChange({ target: { value: 'Doctor-entered dose' } })
  find(tree, node => node.type === 'Select').props.onValueChange('OD')
  find(tree, node => node.type === 'input' && node.props.id === 'rx-med-duration').props.onChange({ target: { value: 'Doctor-entered duration' } })
  tree = picker({ onAdd: item => added.push(item) })
  find(tree, node => node.type === 'button' && text(node).includes('Add to Prescription')).props.onClick()
  assert.equal(added.length, 1)
  assert.equal(added[0].name, medicine.name)
  form.props.onCreated({ medicine: { ...medicine, brandId: 'brand-fixture', composition: 'Saved composition', defaults: {
    defaultDosage: 'Doctor dose', defaultFrequency: 'OD', defaultDuration: '7 days', defaultInstruction: 'Doctor instruction',
  } }, alreadyExists: false })
  tree = picker({ onAdd: item => added.push(item) })
  assert.equal(find(tree, node => node.type === 'input' && node.props.id === 'rx-med-dosage').props.value, 'Doctor dose')
  assert.equal(find(tree, node => node.type === 'input' && node.props.id === 'rx-med-duration').props.value, '7 days')
  find(tree, node => node.type === 'button' && text(node).includes('Add to Prescription')).props.onClick()
  assert.equal(added[1].brandId, 'brand-fixture')
  assert.equal(added[1].manufacturer, 'Fixture company')
  assert.equal(added[1].composition, 'Saved composition')
  let submitted
  const customForm = harness('components/prescriptions/CustomMedicineForm.tsx', {
    '@/actions/medicines.actions': { createCustomMedicine: async input => { submitted = input; return { medicine, alreadyExists: true } } },
  })
  let result
  const props = { initialName: '  Synthetic   brand ', initialSystem: 'AYURVEDIC', onCancel() {}, onCreated: value => { result = value } }
  tree = customForm(props)
  assert.deepEqual(nodes(tree).filter(node => node.type === 'label').map(node => text(node)), ['Name', 'FormTabletCapsuleSyrupSuspensionDropsInjectionOintmentCreamGelInhalerPowderSachetOther', 'Strength (optional)', 'Company / manufacturer (optional)', 'Generic / composition (optional)'])
  assert.equal(nodes(tree).some(node => node.type === 'form'), false, 'must work inside template form')
  const options = nodes(tree).filter(node => node.type === 'option').map(node => node.props.value)
  assert.deepEqual(options, [...schema.medicineForms])
  const buttons = nodes(tree).filter(node => node.type === 'button')
  assert.match(text(buttons.at(-1)), /Save medicine and set dosage/)
  buttons.at(-1).props.onClick()
  await new Promise(setImmediate)
  assert.equal(submitted.name, 'Synthetic brand')
  assert.equal(result.alreadyExists, true)
  const pending = []
  const stalePicker = harness('components/prescriptions/MedicineAutocomplete.tsx', { fetch: (url, options) => new Promise(resolve => pending.push({ url, signal: options.signal, resolve })) })
  let staleTree = stalePicker({ onAdd() {} })
  const searchBox = find(staleTree, node => node.type === 'CommandInput')
  searchBox.props.onValueChange('old')
  searchBox.props.onValueChange('new')
  assert.equal(pending[0].signal.aborted, true)
  pending[1].resolve({ ok: true, json: async () => [{ ...medicine, id: 'new', name: 'Newest fixture' }] })
  await new Promise(setImmediate)
  pending[0].resolve({ ok: true, json: async () => [{ ...medicine, id: 'old', name: 'Stale fixture' }] })
  await new Promise(setImmediate)
  staleTree = stalePicker({ onAdd() {} })
  assert.match(text(staleTree), /Newest fixture/)
  assert.doesNotMatch(text(staleTree), /Stale fixture/)
  console.log('PASS: all-system search, optional 44px filters, AYUSH/company labels, custom field order, nested-form safety, duplicate notice, learned snapshots, stale-request cancellation and template insertion')
})().catch(error => { console.error(error); process.exitCode = 1 })
