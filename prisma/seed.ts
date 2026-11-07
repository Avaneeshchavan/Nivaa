import 'dotenv/config'
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
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!connectionString) throw new Error('Set DIRECT_URL (or DATABASE_URL) before seeding')
  const pool = new Pool({ ...databaseConnection(connectionString), connectionTimeoutMillis: 10000 })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  try {
    const existing = await prisma.medicine.findMany({ select: { id: true, name: true, form: true } })
    const existingIds = new Map(existing.map(medicine => [medicineCatalogId(medicine.name, medicine.form), medicine.id]))
    for (const medicine of catalog) {
      const id = existingIds.get(medicineCatalogId(medicine.name, medicine.form)) || medicineCatalogId(medicine.name, medicine.form)
      await prisma.medicine.upsert({
        where: { id },
        create: { ...medicine, id },
        update: {}, // Re-runs preserve existing edits and create no duplicate seed records.
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
