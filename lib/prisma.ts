import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { optionalEnv } from './env'

type GlobalWithPrisma = { _prisma: PrismaClient | undefined }
const g = globalThis as unknown as GlobalWithPrisma

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL environment variable is not set')
  const parsed = new URL(url)
  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'

  // Verify the database server certificate by default. DATABASE_SSL_CA can hold
  // a PEM bundle for private CAs (escaped newlines are supported), and
  // DATABASE_SSL_REJECT_UNAUTHORIZED=false is an explicit opt-out for local
  // databases that use self-signed certificates.
  const rejectUnauthorized = optionalEnv('DATABASE_SSL_REJECT_UNAUTHORIZED') !== 'false'
  const ca = optionalEnv('DATABASE_SSL_CA')?.replace(/\\n/g, '\n')

  const adapter = new PrismaMariaDb({
    host: parsed.hostname,
    port: parseInt(parsed.port) || 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
    connectionLimit: isLocal ? 10 : 3,
    connectTimeout: 20000,
    ...(isLocal
      ? {}
      : {
          ssl: {
            rejectUnauthorized,
            minVersion: 'TLSv1.2' as const,
            ...(ca ? { ca } : {}),
          },
        }),
  })
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
