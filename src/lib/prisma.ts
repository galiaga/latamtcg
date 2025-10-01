import { PrismaClient } from '@prisma/client'

function withConnectionLimit(dbUrl: string | undefined, limit: number = 5): string | undefined {
  if (!dbUrl) return dbUrl
  try {
    const u = new URL(dbUrl)
    if (!u.searchParams.has('connection_limit')) {
      u.searchParams.set('connection_limit', String(limit))
    }
    return u.toString()
  } catch {
    // Fallback if DATABASE_URL isn't a valid URL (leave unchanged)
    return dbUrl
  }
}

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined
}

const datasourceUrl = withConnectionLimit(process.env.DATABASE_URL, 5)

export const prisma: PrismaClient = global.prismaGlobal ?? new PrismaClient({
  log: ['warn', 'error'],
  datasources: datasourceUrl ? { db: { url: datasourceUrl } } : undefined,
})

if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma
}


