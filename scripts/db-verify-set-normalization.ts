 
import 'dotenv/config'
import { prisma } from '@/lib/prisma'

async function main() {
  const hasSetNameCol = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'MtgCard'
        AND column_name = 'setName'
    ) AS exists;
  `)
  const exists = Boolean(hasSetNameCol?.[0]?.exists)
  console.log('[verify] MtgCard.setName exists:', exists)

  const setCountRows = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(`SELECT COUNT(*)::int AS cnt FROM "public"."Set";`)
  const setCount = Number(setCountRows?.[0]?.cnt || 0)
  const distinctRows = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(`SELECT COUNT(DISTINCT "setCode")::int AS cnt FROM "public"."MtgCard";`)
  const distinct = Number(distinctRows?.[0]?.cnt || 0)
  console.log('[verify] counts', { setTable: setCount, distinctSetCodes: distinct })

  if (setCount < distinct) {
    console.error('[verify] Orphan setCode detected (Set has fewer rows than distinct setCode)')
    process.exit(2)
  }
  process.exit(0)
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})


