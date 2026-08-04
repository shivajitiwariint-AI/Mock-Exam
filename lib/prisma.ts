import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

type GlobalWithPrisma = { _prisma: PrismaClient | undefined }
const g = globalThis as unknown as GlobalWithPrisma

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL environment variable is not set')
  const adapter = new PrismaMariaDb(url)
  return new PrismaClient({ adapter })
}

function getClient(): PrismaClient {
  if (!g._prisma) {
    g._prisma = createClient()
  }
  return g._prisma
}

// Lazy proxy — no DB connection until first use, safe at build time
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    if (typeof value === 'function') {
      return (...args: unknown[]) => (value as (...a: unknown[]) => unknown).apply(client, args)
    }
    return value
  },
})
