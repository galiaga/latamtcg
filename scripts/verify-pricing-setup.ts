#!/usr/bin/env tsx

/**
 * Verification script to check if the pricing system is properly set up
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifySetup() {
  console.log('🔍 Verifying pricing system setup...\n')

  try {
    // Check if PricingConfig table exists and has data
    console.log('1. Checking PricingConfig...')
    const config = await prisma.pricingConfig.findFirst()
    
    if (!config) {
      console.log('❌ PricingConfig not found. Run: npm run db:seed:pricing')
      return false
    }
    
    console.log('✅ PricingConfig found')
    console.log(`   - CLP enabled: ${config.useCLP}`)
    console.log(`   - FX rate: ${Number(config.fxClp)} CLP/USD`)
    console.log(`   - Min per card: ${config.priceMinPerCardClp} CLP`)
    console.log(`   - Order minimum: ${config.minOrderSubtotalClp} CLP`)
    console.log(`   - Shipping: ${config.shippingFlatClp} CLP`)

    // Check if DailyShipping table exists
    console.log('\n2. Checking DailyShipping table...')
    const shippingCount = await prisma.dailyShipping.count()
    console.log(`✅ DailyShipping table accessible (${shippingCount} records)`)

    // Check if MtgCard has computedPriceClp field
    console.log('\n3. Checking MtgCard computedPriceClp field...')
    const cardWithClp = await prisma.mtgCard.findFirst({
      where: { computedPriceClp: { not: null } },
      select: { id: true, computedPriceClp: true }
    })
    
    if (cardWithClp) {
      console.log(`✅ ComputedPriceClp field working (sample: ${cardWithClp.computedPriceClp} CLP)`)
    } else {
      console.log('⚠️  No cards have computedPriceClp yet. Run bulk repricing if needed.')
    }

    // Check total cards with USD prices
    const cardsWithUsd = await prisma.mtgCard.count({
      where: { priceUsd: { not: null } }
    })
    console.log(`   - Cards with USD prices: ${cardsWithUsd}`)

    // Test pricing calculation
    console.log('\n4. Testing pricing calculation...')
    const testCard = await prisma.mtgCard.findFirst({
      where: { priceUsd: { not: null } },
      select: { priceUsd: true, computedPriceClp: true }
    })

    if (testCard) {
      const expectedClp = Math.ceil(Number(testCard.priceUsd) * Number(config.fxClp) * 1.9) // Using alphaLow
      const roundedExpected = Math.ceil(expectedClp / config.roundToStepClp) * config.roundToStepClp
      const minExpected = Math.max(roundedExpected, config.priceMinPerCardClp)
      
      console.log(`✅ Sample calculation:`)
      console.log(`   - USD price: $${testCard.priceUsd}`)
      console.log(`   - Expected CLP: ${minExpected} CLP`)
      console.log(`   - Cached CLP: ${testCard.computedPriceClp || 'Not calculated'}`)
    }

    console.log('\n🎉 Pricing system setup verification complete!')
    console.log('\nNext steps:')
    console.log('1. Set ADMIN_TOKEN environment variable')
    console.log('2. Start dev server: npm run dev')
    console.log('3. Visit /admin/pricing to configure')
    console.log('4. Run bulk repricing if needed')

    return true

  } catch (error) {
    console.error('❌ Verification failed:', error)
    
    if (error instanceof Error && error.message.includes('relation "PricingConfig" does not exist')) {
      console.log('\n💡 Solution: Run the database migration first:')
      console.log('   npm run db:migrate:dev -- --name pricing_system_models')
    }
    
    return false
  }
}

async function main() {
  const success = await verifySetup()
  await prisma.$disconnect()
  process.exit(success ? 0 : 1)
}

main().catch((e) => {
  console.error('Script failed:', e)
  process.exit(1)
})
