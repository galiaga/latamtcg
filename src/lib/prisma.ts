import { PrismaClient } from '@prisma/client'

function withConnectionLimit(dbUrl: string | undefined, limit: number = 5): string | undefined {
  if (!dbUrl) return dbUrl
  try {
    const u = new URL(dbUrl)
    if (!u.searchParams.has('connection_limit')) {
      u.searchParams.set('connection_limit', String(limit))
    }
    // Add connection timeout (30 seconds)
    if (!u.searchParams.has('connect_timeout')) {
      u.searchParams.set('connect_timeout', '30')
    }
    // Add statement timeout (60 seconds)
    if (!u.searchParams.has('statement_timeout')) {
      u.searchParams.set('statement_timeout', '60000')
    }
    return u.toString()
  } catch {
    // Fallback if DATABASE_URL isn't a valid URL (leave unchanged)
    return dbUrl
  }
}

declare global {
   
  var prismaGlobal: PrismaClient | undefined
}

if (!process.env.DATABASE_URL) {
   
  console.error('[prisma] Missing DATABASE_URL')
  throw new Error('Missing DATABASE_URL env var')
}

// Configure pool size based on environment
const poolSize = process.env.NODE_ENV === 'production' 
  ? parseInt(process.env.DB_POOL_SIZE || '20', 10)
  : parseInt(process.env.DB_POOL_SIZE || '10', 10)

const datasourceUrl = withConnectionLimit(process.env.DATABASE_URL, poolSize)

export const prisma: PrismaClient = global.prismaGlobal ?? new PrismaClient({
  log: ['warn', 'error'],
  datasources: datasourceUrl ? { db: { url: datasourceUrl } } : undefined,
  // Add transaction timeout
  transactionOptions: {
    timeout: 30000, // 30 seconds
  },
})

if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma
}


