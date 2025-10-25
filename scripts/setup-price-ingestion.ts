import { prisma } from '@/lib/prisma'

async function setupPriceIngestion() {
  console.log('[setup] Creating scryfall_daily_prices_stage table...')
  
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS scryfall_daily_prices_stage (
      scryfall_id uuid NOT NULL PRIMARY KEY,
      price_usd numeric(10,2) NULL,
      price_usd_foil numeric(10,2) NULL,
      price_usd_etched numeric(10,2) NULL,
      price_day date NOT NULL
    )
  `
  
  console.log('[setup] Adding unique index for idempotency...')
  
  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_price_hist_day
      ON mtgcard_price_history (scryfall_id, finish, price_day)
  `
  
  console.log('[setup] Adding performance indexes...')
  
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS idx_scryfall_stage_scryfall_id 
      ON scryfall_daily_prices_stage (scryfall_id)
  `
  
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS idx_scryfall_stage_price_day 
      ON scryfall_daily_prices_stage (price_day)
  `
  
  console.log('[setup] Setup completed successfully!')
}

setupPriceIngestion().catch(console.error)
