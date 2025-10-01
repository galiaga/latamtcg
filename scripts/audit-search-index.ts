import { prisma } from '@/lib/prisma'

async function main() {
  const total = await prisma.searchIndex.count()
  // Treat missing/invalid IDs as those with length < 8 (should be UUID ~36)
  const rows = await prisma.searchIndex.findMany({ select: { id: true }, take: 100000 })
  const missing = rows.filter((r) => !r.id || String(r.id).length < 8).length
  console.log('[audit] total', total, 'missingId', missing)
  if (missing > 0) process.exit(2)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


