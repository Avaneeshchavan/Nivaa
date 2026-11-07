import { loadEnvConfig } from '@next/env'
import { makeBrand } from '../lib/medicines/brand'
import { databaseConnection } from '../lib/database-connection'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../lib/generated/prisma/client'
import { medicineCatalogId } from '../lib/medicines/catalog'
import { ayurvedicCatalog } from './ayurvedic-catalog'
import { medicineCatalog } from './medicine-catalog'

async function main() {
  const ids = medicineCatalog.map(({ name, form }) => medicineCatalogId(name, form))
  if (medicineCatalog.length < 150 || new Set(ids).size !== ids.length) {
    throw new Error('Catalog must contain at least 150 unique presentations')
  }
  const catalog = process.argv.includes('--ayurvedic-only') ? ayurvedicCatalog : [...medicineCatalog, ...ayurvedicCatalog]
  if (new Set(catalog.map(m => medicineCatalogId(m.name, m.form))).size !== catalog.length) throw new Error('Duplicate catalog entries')
  if (process.argv.includes('--dry-run')) {
    console.log(`Validated ${catalog.length} unique medicine presentations; no database writes`)
    return
  }
  loadEnvConfig(process.cwd(), false, { info() {}, error() {} })
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!connectionString) throw new Error('Set DIRECT_URL (or DATABASE_URL) before seeding')
  const pool = new Pool({ ...databaseConnection(connectionString), connectionTimeoutMillis: 10000 })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  try {
    const existing = await prisma.medicine.findMany({ select: { id: true, name: true, form: true } })
    const existingIds = new Map(existing.map(medicine => [medicineCatalogId(medicine.name, medicine.form), medicine.id]))
    for (const medicine of catalog) {
      const id = existingIds.get(medicineCatalogId(medicine.name, medicine.form)) || medicineCatalogId(medicine.name, medicine.form)
      const stored = await prisma.medicine.upsert({
        where: { id },
        create: { ...medicine, id },
        update: {}, // Re-runs preserve existing edits and create no duplicate seed records.
      })
      // Fresh installs seed Medicine after migrations. Bridge those records into
      // the searchable catalog too, using the same IDs as the N1 backfill.
      const brand = makeBrand({ source: 'LEGACY', sourceId: stored.id, name: stored.name,
        formText: stored.form || '', manufacturer: stored.manufacturer,
        compositionText: stored.generic || '', system: stored.system === 'AYURVEDIC' ? 'AYUSH' : 'ALLOPATHY' })
      await prisma.brand.upsert({ where: { legacyMedicineId: stored.id },
        create: { ...brand, id: `legacy_${stored.id}`, identityKey: `legacy:${stored.id}`, legacyMedicineId: stored.id },
        update: {},
      })
    }
    console.log(`Seeded ${catalog.length} medicine presentations`)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch(() => {
  // Avoid logging connection strings or database details on failure.
  console.error('Medicine seed failed. Check database access and docs/DB_NOTES.md.')
  process.exitCode = 1
})
