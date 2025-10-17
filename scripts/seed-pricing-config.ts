#!/usr/bin/env tsx

/**
 * Migration script to add pricing system models
 * Run this when database is available
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating default PricingConfig...')
  
  try {
    // Check if config already exists
    const existingConfig = await prisma.pricingConfig.findFirst()
    
    if (existingConfig) {
      console.log('PricingConfig already exists, skipping creation')
      return
    }

    // Create default configuration
    const config = await prisma.pricingConfig.create({
      data: {
        useCLP: true,
        fxClp: 950,
        alphaTierLowUsd: 5,
        alphaTierMidUsd: 20,
        alphaLow: 0.9,
        alphaMid: 0.7,
        alphaHigh: 0.5,
        priceMinPerCardClp: 500,
        roundToStepClp: 500,
        minOrderSubtotalClp: 10000,
        shippingFlatClp: 2500,
        freeShippingThresholdClp: 25000
      }
    })

    console.log('Created default PricingConfig:', config.id)
  } catch (error) {
    console.error('Error creating PricingConfig:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
