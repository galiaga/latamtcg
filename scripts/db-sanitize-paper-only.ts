/* eslint-disable no-console */
import 'dotenv/config'
import { prisma } from '@/lib/prisma'

async function main() {
  const before = await prisma.$queryRawUnsafe<any[]>(
    'SELECT COUNT(*)::bigint AS total, SUM(CASE WHEN "isPaper" = false THEN 1 ELSE 0 END)::bigint AS not_paper_flag FROM "public"."MtgCard";'
  )
  console.log('[sanitize] before summary')
  console.table(before)

  console.log('[sanitize] deleting non-paper')
  await prisma.$executeRawUnsafe('DELETE FROM "public"."MtgCard" WHERE ("isPaper" = false);')

  console.log('[sanitize] enforcing check constraint')
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'mtgcard_paper_only_chk'
        ) THEN
          ALTER TABLE "public"."MtgCard"
            ADD CONSTRAINT mtgcard_paper_only_chk CHECK ("isPaper" = true);
        END IF;
      END $$;
    `)
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (!/already exists|duplicate|mtgcard_paper_only_chk/i.test(msg)) {
      throw e
    }
  }

  console.log('[sanitize] VACUUM ANALYZE MtgCard')
  await prisma.$executeRawUnsafe('VACUUM (ANALYZE) "public"."MtgCard";')

  const after = await prisma.$queryRawUnsafe<any[]>(
    'SELECT COUNT(*)::bigint AS total, SUM(CASE WHEN "isPaper" = false THEN 1 ELSE 0 END)::bigint AS not_paper_flag FROM "public"."MtgCard";'
  )
  console.log('[sanitize] after summary')
  console.table(after)
}

;(async () => {
  try {
    await main()
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
})()


