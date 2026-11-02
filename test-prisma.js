const { PrismaClient } = require('./lib/generated/prisma/client.js')
try {
  const prisma = new PrismaClient({ url: process.env.DATABASE_URL })
  console.log('Success')
} catch (e) {
  console.error(e)
}
