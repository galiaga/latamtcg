import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setupKvState() {
  console.log('Setting up kv_state table...')
  
  try {
    // Create kv_state table if it doesn't exist
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS kv_state (
        key VARCHAR(255) PRIMARY KEY,
        value_text TEXT,
        value_numeric NUMERIC,
        value_boolean BOOLEAN,
        value_date DATE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    console.log('✅ kv_state table created successfully')
    
    // Create index for common queries
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_kv_state_updated_at ON kv_state(updated_at)
    `
    
    console.log('✅ Index created successfully')
    
  } catch (error) {
    console.error('❌ Error setting up kv_state table:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

setupKvState().catch(console.error)
