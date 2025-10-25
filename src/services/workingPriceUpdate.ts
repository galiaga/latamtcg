"use server"
import { prisma } from '@/lib/prisma'
import fs from 'node:fs'
import path from 'node:path'

type DailyUpdateSummary = {
  updated: number
  skipped: boolean
  durationMs: number
}

export async function runWorkingPriceUpdate(): Promise<DailyUpdateSummary> {
  const startTime = Date.now()
  
  try {
    console.log('[scryfall] Starting WORKING price update...')
    
    const csvPath = path.join(process.cwd(), 'data', 'daily-prices.csv')
    
    if (!fs.existsSync(csvPath)) {
      throw new Error('CSV file not found. Run the CSV generation first.')
    }
    
    // Get file stats
    const stats = fs.statSync(csvPath)
    const fileSizeMB = Math.round(stats.size / 1024 / 1024)
    console.log(`[scryfall] Processing CSV file: ${fileSizeMB}MB`)
    
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
    
    // Read CSV and insert into staging table (like the original working version)
    console.log('[scryfall] Reading CSV and inserting into staging table...')
    const csvContent = fs.readFileSync(csvPath, 'utf8')
    const lines = csvContent.split('\n').slice(1) // Skip header
    
    let importedCount = 0
    for (const line of lines) {
      if (line.trim()) {
        const [scryfall_id, price_usd, price_usd_foil, price_usd_etched, price_day] = line.split(',')
        if (scryfall_id) {
          // Convert empty strings to null for proper database handling
          const normalizedUsd = price_usd && price_usd.trim() ? price_usd : null
          const normalizedFoil = price_usd_foil && price_usd_foil.trim() ? price_usd_foil : null
          const normalizedEtched = price_usd_etched && price_usd_etched.trim() ? price_usd_etched : null

          await prisma.$executeRaw`
            INSERT INTO prices_staging (scryfall_id, price_usd, price_usd_foil, price_usd_etched, price_day)
            VALUES (${scryfall_id}, ${normalizedUsd}::numeric, ${normalizedFoil}::numeric, ${normalizedEtched}::numeric, ${price_day}::date)
            ON CONFLICT (scryfall_id) DO UPDATE SET
              price_usd = EXCLUDED.price_usd,
              price_usd_foil = EXCLUDED.price_usd_foil,
              price_usd_etched = EXCLUDED.price_usd_etched,
              price_day = EXCLUDED.price_day
          `
          importedCount++
        }
      }
    }

    console.log(`[scryfall] Imported ${importedCount.toLocaleString()} price records to staging table`)
    
    // Bulk update card prices (only if they exist in our DB and prices changed)
    console.log('[scryfall] Bulk updating card prices...')
    
    const usdUpdates = await prisma.$executeRaw`
      UPDATE "MtgCard" mc
      SET "priceUsd" = ps.price_usd::numeric,
          "priceUpdatedAt" = now()
      FROM prices_staging ps
      WHERE mc."scryfallId"::text = ps.scryfall_id
        AND ps.price_usd IS NOT NULL AND ps.price_usd != '' AND ps.price_usd != 'null'
        AND (mc."priceUsd" IS DISTINCT FROM ps.price_usd::numeric)
    `

    const foilUpdates = await prisma.$executeRaw`
      UPDATE "MtgCard" mc
      SET "priceUsdFoil" = ps.price_usd_foil::numeric,
          "priceUpdatedAt" = now()
      FROM prices_staging ps
      WHERE mc."scryfallId"::text = ps.scryfall_id
        AND ps.price_usd_foil IS NOT NULL AND ps.price_usd_foil != '' AND ps.price_usd_foil != 'null'
        AND (mc."priceUsdFoil" IS DISTINCT FROM ps.price_usd_foil::numeric)
    `

    const etchedUpdates = await prisma.$executeRaw`
      UPDATE "MtgCard" mc
      SET "priceUsdEtched" = ps.price_usd_etched::numeric,
          "priceUpdatedAt" = now()
      FROM prices_staging ps
      WHERE mc."scryfallId"::text = ps.scryfall_id
        AND ps.price_usd_etched IS NOT NULL AND ps.price_usd_etched != '' AND ps.price_usd_etched != 'null'
        AND (mc."priceUsdEtched" IS DISTINCT FROM ps.price_usd_etched::numeric)
    `

    console.log(`[scryfall] Updated ${usdUpdates} USD prices, ${foilUpdates} foil prices, ${etchedUpdates} etched prices`)

    // Insert price history for ALL cards from bulk data (complete daily snapshot)
    console.log('[scryfall] Inserting complete daily price history for ALL cards...')

    const normalHistory = await prisma.$executeRaw`
      INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day)
      SELECT ps.scryfall_id::uuid, 'normal', ps.price_usd::numeric, now(), ps.price_day::date
      FROM prices_staging ps
    `

    const foilHistory = await prisma.$executeRaw`
      INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day)
      SELECT ps.scryfall_id::uuid, 'foil', ps.price_usd_foil::numeric, now(), ps.price_day::date
      FROM prices_staging ps
    `

    const etchedHistory = await prisma.$executeRaw`
      INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day)
      SELECT ps.scryfall_id::uuid, 'etched', ps.price_usd_etched::numeric, now(), ps.price_day::date
      FROM prices_staging ps
    `

    console.log(`[scryfall] Added ${normalHistory} normal, ${foilHistory} foil, ${etchedHistory} etched price history records`)

    // Cleanup staging table
    await prisma.$executeRaw`DROP TABLE IF EXISTS prices_staging`

    const durationMs = Date.now() - startTime
    const totalUpdates = Number(usdUpdates) + Number(foilUpdates) + Number(etchedUpdates)
    const totalPriceHistory = Number(normalHistory) + Number(foilHistory) + Number(etchedHistory)
    
    console.log(`[scryfall] WORKING price update completed:`)
    console.log(`- Cards processed: ${importedCount.toLocaleString()}`)
    console.log(`- Cards updated: ${totalUpdates.toLocaleString()}`)
    console.log(`- Price history entries: ${totalPriceHistory.toLocaleString()}`)
    console.log(`- Duration: ${durationMs}ms`)
    
    return {
      updated: totalUpdates,
      skipped: false,
      durationMs
    }
    
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    console.error('[scryfall] WORKING price update failed:', error)
    
    return {
      updated: 0,
      skipped: true,
      durationMs
    }
  }
}
