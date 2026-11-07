import { databaseConnection } from './database-connection'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

const prismaClientSingleton = () => {
  const pool = new Pool({ ...databaseConnection(process.env.DATABASE_URL), max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000 })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter, log: [], errorFormat: 'minimal' })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

globalForPrisma.prisma = prisma
