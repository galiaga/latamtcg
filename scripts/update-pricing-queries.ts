#!/usr/bin/env tsx

/**
 * Script to update pricing queries to use computedPriceClp column
 * Run this after the database migration is complete
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updatePricingQueries() {
  console.log('🔄 Updating pricing queries to use computedPriceClp column...')
  
  try {
    // Test if the column exists
    const testQuery = await prisma.$queryRaw`
      SELECT "computedPriceClp" FROM "public"."MtgCard" LIMIT 1
    `
    
    console.log('✅ computedPriceClp column exists!')
    console.log('📝 Update the following files to use the actual column:')
    console.log('   1. src/lib/printings.ts - Replace NULL AS "computedPriceClp" with c."computedPriceClp"')
    console.log('   2. src/app/mtg/printing/[printingId]/page.tsx - Replace NULL AS "computedPriceClp" with c."computedPriceClp"')
    console.log('   3. src/services/searchOptimized.ts - Replace NULL AS "computedPriceClp" with mc."computedPriceClp"')
    console.log('   4. src/services/searchQueryGroupedSimple.ts - Replace NULL AS "computedPriceClp" with mc."computedPriceClp"')
    console.log('')
    console.log('🔍 Sample query to verify:')
    console.log('   SELECT "computedPriceClp" FROM "public"."MtgCard" WHERE "computedPriceClp" IS NOT NULL LIMIT 5')
    
    const sampleData = await prisma.$queryRaw`
      SELECT "computedPriceClp" FROM "public"."MtgCard" WHERE "computedPriceClp" IS NOT NULL LIMIT 5
    `
    
    console.log('📊 Sample computedPriceClp values:', sampleData)
    
  } catch (error) {
    console.log('❌ computedPriceClp column does not exist yet')
    console.log('💡 Run the database migration first:')
    console.log('   npm run db:migrate:dev -- --name pricing_system_models')
    console.log('')
    console.log('Then run this script again to update the queries.')
  }
}

async function main() {
  await updatePricingQueries()
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('Script failed:', e)
  process.exit(1)
})
