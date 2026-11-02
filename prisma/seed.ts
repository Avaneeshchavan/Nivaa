import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../lib/generated/prisma/client'
import { medicineCatalogId } from '../lib/medicines/catalog'
import { medicineCatalog } from './medicine-catalog'

async function main() {
  const ids = medicineCatalog.map(({ name, form }) => medicineCatalogId(name, form))
  if (medicineCatalog.length < 150 || new Set(ids).size !== ids.length) {
    throw new Error('Catalog must contain at least 150 unique presentations')
  }
  if (process.argv.includes('--dry-run')) {
    console.log(`Validated ${medicineCatalog.length} unique medicine presentations; no database writes`)
    return
  }
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!connectionString) throw new Error('Set DIRECT_URL (or DATABASE_URL) before seeding')
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 10000 })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  try {
    for (const medicine of medicineCatalog) {
      await prisma.medicine.upsert({
        where: { id: medicineCatalogId(medicine.name, medicine.form) },
        create: medicine,
        update: {}, // Re-runs preserve existing edits and create no duplicate seed records.
      })
    }
    console.log(`Seeded ${medicineCatalog.length} medicine presentations`)
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
