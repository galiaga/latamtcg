#!/usr/bin/env tsx

/**
 * Script to seed the default StorePolicy
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedStorePolicy() {
  console.log('🌱 Seeding StorePolicy...')

  try {
    // Check if policy already exists
    const existing = await prisma.storePolicy.findFirst()
    
    if (existing) {
      console.log('✅ StorePolicy already exists:', {
        maxCopiesPerItem: existing.maxCopiesPerItem,
        purchaseWindowDays: existing.purchaseWindowDays
      })
      return
    }

    // Create default policy
    const policy = await prisma.storePolicy.create({
      data: {
        maxCopiesPerItem: 4,
        purchaseWindowDays: 3
      }
    })

    console.log('✅ Created default StorePolicy:', {
      id: policy.id,
      maxCopiesPerItem: policy.maxCopiesPerItem,
      purchaseWindowDays: policy.purchaseWindowDays
    })

  } catch (error) {
    console.error('❌ Failed to seed StorePolicy:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedStorePolicy().catch((e) => {
  console.error('Script failed:', e)
  process.exit(1)
})
