import { createHash } from 'node:crypto'
import prisma from '@/lib/prisma'

export async function consumeRateLimit(scope: 'login' | 'pdf' | 'upload', identity: string, limit: number, windowSeconds: number) {
  const key = createHash('sha256').update(`${scope}\0${identity}`).digest('hex')
  // One atomic statement shares the budget across Vercel processes and concurrent requests.
  const rows = await prisma.$queryRaw<{ attempts: number }[]>`
    INSERT INTO public."RateLimit" (key, attempts, "windowStartedAt") VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN "RateLimit"."windowStartedAt" <= now() - ${windowSeconds} * interval '1 second'
        THEN 1 ELSE least("RateLimit".attempts + 1, ${limit + 1}) END,
      "windowStartedAt" = CASE WHEN "RateLimit"."windowStartedAt" <= now() - ${windowSeconds} * interval '1 second'
        THEN now() ELSE "RateLimit"."windowStartedAt" END
    RETURNING attempts
  `
  return rows[0].attempts <= limit
}
