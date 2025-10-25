"use server"
import { prisma } from '@/lib/prisma'
import fs from 'node:fs'
import path from 'node:path'

type DailyUpdateSummary = {
  updated: number
  skipped: boolean
  durationMs: number
}

export async function runUltraFastPriceUpdate(): Promise<DailyUpdateSummary> {
  const startTime = Date.now()
  
  try {
    console.log('[scryfall] Starting ULTRA FAST price update...')
    
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
    
    // Use COPY command for ultra-fast import
    console.log('[scryfall] Using COPY command for ultra-fast import...')
    
    const copyResult = await prisma.$executeRaw`
      COPY prices_staging (scryfall_id, price_usd, price_usd_foil, price_usd_etched, price_day)
      FROM '${csvPath}'
      WITH (FORMAT csv, HEADER true, NULL '')
    `
    
    console.log(`[scryfall] COPY completed: ${copyResult} records imported`)
    
    // Get count from staging table
    const stagingCount = await prisma.$executeRaw`
      SELECT COUNT(*) as count FROM prices_staging
    `
    console.log(`[scryfall] Staging table has ${stagingCount} records`)
    
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
    
    console.log(`[scryfall] ULTRA FAST price update completed:`)
    console.log(`- Cards processed: ${stagingCount}`)
    console.log(`- Cards updated: ${(Number(usdUpdates) + Number(foilUpdates) + Number(etchedUpdates)).toLocaleString()}`)
    console.log(`- Price history entries: ${totalPriceHistory.toLocaleString()}`)
    console.log(`- Duration: ${durationMs}ms`)
    
    return {
      updated: Number(stagingCount),
      skipped: false,
      durationMs
    }
    
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    console.error('[scryfall] ULTRA FAST price update failed:', error)
    
    return {
      updated: 0,
      skipped: true,
      durationMs
    }
  }
}
