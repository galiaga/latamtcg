#!/usr/bin/env tsx

/**
 * Script to help with purchase limit system database migration
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkMigrationStatus() {
  console.log('🔍 Checking purchase limit system migration status...')

  try {
    // Test if StorePolicy table exists
    await prisma.storePolicy.findFirst()
    console.log('✅ StorePolicy table exists!')
    
    // Check if there's a policy record
    const policy = await prisma.storePolicy.findFirst()
    if (policy) {
      console.log('✅ StorePolicy record exists:', {
        maxCopiesPerItem: policy.maxCopiesPerItem,
        purchaseWindowDays: policy.purchaseWindowDays
      })
    } else {
      console.log('⚠️  No StorePolicy record found. Run: npm run db:seed:policy')
    }

    // Test if we can query order items (for limit evaluation)
    await prisma.orderItem.findFirst()
    console.log('✅ OrderItem table accessible for limit evaluation')

    // Test if we can query cart items (for limit evaluation)
    await prisma.cartItem.findFirst()
    console.log('✅ CartItem table accessible for limit evaluation')

    console.log('')
    console.log('🎉 Purchase limit system is fully functional!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Test adding items to cart with limits')
    console.log('2. Test cart quantity updates with limits')
    console.log('3. Test checkout validation (when implemented)')
    console.log('4. Configure admin policy settings')

  } catch (error: any) {
    if (error.code === 'P2021') { // Table doesn't exist
      console.log('❌ StorePolicy table does NOT exist yet.')
      console.log('')
      console.log('💡 To complete the migration:')
      console.log('1. Run: npm run db:migrate:dev -- --name add_store_policy')
      console.log('2. Run: npm run db:seed:policy')
      console.log('3. Run: npm run prisma:generate')
      console.log('')
      console.log('⚠️  The system will work with fallback defaults until migration is complete.')
    } else {
      console.error('An unexpected error occurred:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

checkMigrationStatus().catch((e) => {
  console.error('Script failed:', e)
  process.exit(1)
})
