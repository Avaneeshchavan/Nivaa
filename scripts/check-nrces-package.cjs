require('tsx/cjs')
const assert = require('node:assert/strict')
const { parseNrcesTable } = require('../lib/medicines/nrces-package.ts')
const required = ['Identifier', 'Brand Name']
const table = parseNrcesTable('Identifier\tBrand Name\n123456789012345678\tFixture "literal"\t\n123\tFixture\n124\tWrong\tExtra\n', 'fixture', required)
assert.equal(table.rows.length, 2)
assert.equal(table.rows[0].row.Identifier, '123456789012345678', 'retain large identifier as text')
assert.equal(table.rows[0].row['Brand Name'], 'Fixture "literal"')
assert.equal(table.issues.length, 1)
assert.equal(table.issues[0].record, 4)
assert.throws(() => parseNrcesTable('Id\tName\n1\tX', 'fixture', required), /headers/)
assert.throws(() => parseNrcesTable('Identifier\tIdentifier\n1\tX', 'fixture', required), /headers/)
console.log('PASS: actual NRCeS TSV conventions, optional trailing tab, literal quotes, quarantine, header validation and lossless identifiers')
const fs = require('node:fs/promises')
const path = require('node:path')
const { tmpdir } = require('node:os')
const { readNrcesPackage } = require('../lib/medicines/nrces-package.ts')
;(async () => {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'nivaa-nrces-fixture-'))
  const header = 'Identifier\tBrand Name\tProduct Identifier\tSupplier Identifier\tGeneric Identifier\tLicense Status\tlast_updated_on\n'
  const brands = Array.from({ length: 200 }, (_, i) => `${100000000000000000n + BigInt(i)}\tSynthetic ${i}\tp\ts\tg\tUNKNOWN\t20260831\t`)
  // Use numeric text keys just like the source, never floating-point IDs.
  const valid = brands.join('\n').replace(/\tp\t/g, '\t1\t').replace(/\ts\t/g, '\t2\t').replace(/\tg\t/g, '\t3\t')
  try {
    await Promise.all([
      fs.writeFile(path.join(dir, 'BrandMaster.txt'), header + valid + '\n900\tUnlinked\t1\t2\t999\tUNKNOWN\t20260831\t\n901\t\t1\t2\t3\tUNKNOWN\t20260831\t\nmalformed\textra\trow\n'),
      fs.writeFile(path.join(dir, 'GenericMaster.txt'), 'Identifier\tGeneric Name\tDose Form\n3\tSynthetic source composition\t4\t\n'),
      fs.writeFile(path.join(dir, 'ProductMaster.txt'), 'Identifier\tProduct Name\n1\tSynthetic product\t\n'),
      fs.writeFile(path.join(dir, 'SupplierMaster.txt'), 'Identifier\tSupplier Name\n2\tSynthetic supplier\t\n'),
      fs.writeFile(path.join(dir, 'DrugFormMaster.txt'), 'Id\tDose Form\n4\tSynthetic source form\n'),
    ])
    const joined = await readNrcesPackage(dir)
    assert.equal(joined.brands.length, 200)
    assert.equal(joined.issues.length, 3)
    assert.equal(joined.brands[0].sourceId, '100000000000000000')
    assert.equal(joined.brands[0].compositionText, 'Synthetic source composition')
    assert.equal(joined.brands[0].marketingLicenseStatus, 'UNKNOWN')
    assert.equal(joined.brands[0].manufacturer, 'Synthetic supplier')
    assert.equal(joined.brands[0].formText, 'Synthetic source form')
    assert.equal('dosage' in joined.brands[0], false)
    assert.equal('isDiscontinued' in joined.brands[0], false, 'unknown source status must not be invented')
    await fs.appendFile(path.join(dir, 'BrandMaster.txt'), valid.split('\n')[0] + '\n')
    await assert.rejects(readNrcesPackage(dir), /duplicate identifier/)
    console.log('PASS: 200 joined fixture brands, exact company/composition/form, broken-link quarantine, duplicate-ID rejection and no inferred dose/status')
  } finally { await fs.rm(dir, { recursive: true, force: true }) }
})().catch(error => { console.error(error); process.exitCode = 1 })
