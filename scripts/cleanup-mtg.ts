/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const deleted = await prisma.mtgCard.deleteMany({
    where: { OR: [{ isPaper: false }, { lang: { not: 'en' } }] },
  })
  console.log('[cleanup] removed rows:', deleted.count)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


