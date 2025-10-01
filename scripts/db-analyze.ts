/* eslint-disable no-console */
import 'dotenv/config'
import { prisma } from '@/lib/prisma'

async function main() {
  await prisma.$executeRawUnsafe('ANALYZE "public"."MtgCard";')
  await prisma.$executeRawUnsafe('ANALYZE "public"."Set";')
  console.log('ANALYZE done')
}

main().then(() => process.exit(0)).catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})


