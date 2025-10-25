"use server"
import { prisma } from '@/lib/prisma'
import fs from 'node:fs'
import path from 'node:path'

type DailyUpdateSummary = {
  updated: number
  skipped: boolean
  durationMs: number
}

export async function runFastPriceUpdate(): Promise<DailyUpdateSummary> {
  const startTime = Date.now()
  
  try {
    console.log('[scryfall] Starting FAST price update...')
    
    const csvPath = path.join(process.cwd(), 'data', 'daily-prices.csv')
    
    if (!fs.existsSync(csvPath)) {
      throw new Error('CSV file not found. Run the CSV generation first.')
    }
    
    // Read CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf8')
    const lines = csvContent.split('\n').slice(1) // Skip header
    const totalCards = lines.length - 1 // Subtract empty last line
    
    console.log(`[scryfall] Processing ${totalCards.toLocaleString()} cards from CSV...`)
    
    // Create staging table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS prices_staging (
        scryfall_id text PRIMARY KEY,
        price_usd numeric,
        price_usd_foil numeric,
        price_usd_etched numeric,
        price_day date NOT NULL
      )
    `
    
    // Clear staging table
    await prisma.$executeRaw`TRUNCATE TABLE prices_staging`
    
    // Bulk insert into staging table
    console.log('[scryfall] Bulk inserting into staging table...')
    const stagingInserts = []
    
    for (const line of lines) {
      if (!line.trim()) continue
      
      const [scryfall_id, price_usd, price_usd_foil, price_usd_etched, price_day] = line.split(',')
      
      if (!scryfall_id) continue
      
      // Convert empty strings to null
      const normalizedUsd = price_usd && price_usd.trim() ? price_usd : null
      const normalizedFoil = price_usd_foil && price_usd_foil.trim() ? price_usd_foil : null
      const normalizedEtched = price_usd_etched && price_usd_etched.trim() ? price_usd_etched : null
      
      stagingInserts.push({
        scryfall_id,
        price_usd: normalizedUsd,
        price_usd_foil: normalizedFoil,
        price_usd_etched: normalizedEtched,
        price_day
      })
    }
    
    // Insert in batches of 1000 using individual inserts
    const batchSize = 1000
    for (let i = 0; i < stagingInserts.length; i += batchSize) {
      const batch = stagingInserts.slice(i, i + batchSize)
      
      for (const item of batch) {
        await prisma.$executeRaw`
          INSERT INTO prices_staging (scryfall_id, price_usd, price_usd_foil, price_usd_etched, price_day)
          VALUES (${item.scryfall_id}, ${item.price_usd}, ${item.price_usd_foil}, ${item.price_usd_etched}, ${item.price_day}::date)
          ON CONFLICT (scryfall_id) DO UPDATE SET
            price_usd = EXCLUDED.price_usd,
            price_usd_foil = EXCLUDED.price_usd_foil,
            price_usd_etched = EXCLUDED.price_usd_etched,
            price_day = EXCLUDED.price_day
        `
      }
      
      if (i % 10000 === 0) {
        console.log(`[scryfall] Staging: ${i.toLocaleString()}/${stagingInserts.length.toLocaleString()}`)
      }
    }
    
    console.log(`[scryfall] Staging table populated with ${stagingInserts.length.toLocaleString()} records`)
    
    // Bulk update card prices
    console.log('[scryfall] Bulk updating card prices...')
    
    const usdUpdates = await prisma.$executeRaw`
      UPDATE "MtgCard" mc
      SET "priceUsd" = ps.price_usd,
          "priceUpdatedAt" = now()
      FROM prices_staging ps
      WHERE mc."scryfallId"::text = ps.scryfall_id
        AND ps.price_usd IS NOT NULL
    `
    
    const foilUpdates = await prisma.$executeRaw`
      UPDATE "MtgCard" mc
      SET "priceUsdFoil" = ps.price_usd_foil,
          "priceUpdatedAt" = now()
      FROM prices_staging ps
      WHERE mc."scryfallId"::text = ps.scryfall_id
        AND ps.price_usd_foil IS NOT NULL
    `
    
    const etchedUpdates = await prisma.$executeRaw`
      UPDATE "MtgCard" mc
      SET "priceUsdEtched" = ps.price_usd_etched,
          "priceUpdatedAt" = now()
      FROM prices_staging ps
      WHERE mc."scryfallId"::text = ps.scryfall_id
        AND ps.price_usd_etched IS NOT NULL
    `
    
    console.log(`[scryfall] Updated ${usdUpdates} USD, ${foilUpdates} foil, ${etchedUpdates} etched prices`)
    
    // Bulk insert price history
    console.log('[scryfall] Bulk inserting price history...')
    
    const normalHistory = await prisma.$executeRaw`
      INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day)
      SELECT ps.scryfall_id::uuid, 'normal', ps.price_usd::numeric, now(), ps.price_day::date
      FROM prices_staging ps
      WHERE ps.price_usd IS NOT NULL
    `
    
    const foilHistory = await prisma.$executeRaw`
      INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day)
      SELECT ps.scryfall_id::uuid, 'foil', ps.price_usd_foil::numeric, now(), ps.price_day::date
      FROM prices_staging ps
      WHERE ps.price_usd_foil IS NOT NULL
    `
    
    const etchedHistory = await prisma.$executeRaw`
      INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day)
      SELECT ps.scryfall_id::uuid, 'etched', ps.price_usd_etched::numeric, now(), ps.price_day::date
      FROM prices_staging ps
      WHERE ps.price_usd_etched IS NOT NULL
    `
    
    console.log(`[scryfall] Added ${normalHistory} normal, ${foilHistory} foil, ${etchedHistory} etched price history records`)
    
    // Cleanup
    await prisma.$executeRaw`DROP TABLE IF EXISTS prices_staging`
    
    const durationMs = Date.now() - startTime
    const totalPriceHistory = Number(normalHistory) + Number(foilHistory) + Number(etchedHistory)
    
    console.log(`[scryfall] FAST price update completed:`)
    console.log(`- Cards processed: ${stagingInserts.length.toLocaleString()}`)
    console.log(`- Cards updated: ${(Number(usdUpdates) + Number(foilUpdates) + Number(etchedUpdates)).toLocaleString()}`)
    console.log(`- Price history entries: ${totalPriceHistory.toLocaleString()}`)
    console.log(`- Duration: ${durationMs}ms`)
    
    return {
      updated: stagingInserts.length,
      skipped: false,
      durationMs
    }
    
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    console.error('[scryfall] FAST price update failed:', error)
    
    return {
      updated: 0,
      skipped: true,
      durationMs
    }
  }
}
