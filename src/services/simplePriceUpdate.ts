"use server"
import { prisma } from '@/lib/prisma'
import fs from 'node:fs'
import path from 'node:path'

type DailyUpdateSummary = {
  updated: number
  skipped: boolean
  durationMs: number
}

export async function runSimplePriceUpdate(): Promise<DailyUpdateSummary> {
  const startTime = Date.now()
  
  try {
    console.log('[scryfall] Starting simple price update...')
    
    const csvPath = path.join(process.cwd(), 'data', 'daily-prices.csv')
    
    if (!fs.existsSync(csvPath)) {
      throw new Error('CSV file not found. Run the CSV generation first.')
    }
    
    // Read CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf8')
    const lines = csvContent.split('\n').slice(1) // Skip header
    const totalCards = lines.length - 1 // Subtract empty last line
    
    console.log(`[scryfall] Processing ${totalCards.toLocaleString()} cards from CSV...`)
    
    let processedCount = 0
    let updatedCards = 0
    let priceHistoryEntries = 0
    
    // Process cards in batches
    const batchSize = 1000
    
    for (let i = 0; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, i + batchSize).filter(line => line.trim())
      
      for (const line of batch) {
        const [scryfall_id, price_usd, price_usd_foil, price_usd_etched, price_day] = line.split(',')
        
        if (!scryfall_id) continue
        
        // Parse prices (empty strings become null)
        const normalPrice = price_usd && price_usd.trim() ? parseFloat(price_usd) : null
        const foilPrice = price_usd_foil && price_usd_foil.trim() ? parseFloat(price_usd_foil) : null
        const etchedPrice = price_usd_etched && price_usd_etched.trim() ? parseFloat(price_usd_etched) : null
        
        // Update card prices in database
        const updateResult = await prisma.mtgCard.updateMany({
          where: { scryfallId: scryfall_id },
          data: {
            priceUsd: normalPrice,
            priceUsdFoil: foilPrice,
            priceUsdEtched: etchedPrice,
            priceUpdatedAt: new Date()
          }
        })
        
        if (updateResult.count > 0) {
          updatedCards++
        }
        
        // Insert price history entries for cards WITH prices
        const historyRecords = []
        const today = new Date(price_day)
        
        // Only insert if there's a price
        if (normalPrice !== null) {
          historyRecords.push({
            scryfall_id: scryfall_id,
            finish: 'normal',
            price: normalPrice,
            price_at: new Date(),
            price_day: today
          })
        }
        
        if (foilPrice !== null) {
          historyRecords.push({
            scryfall_id: scryfall_id,
            finish: 'foil',
            price: foilPrice,
            price_at: new Date(),
            price_day: today
          })
        }
        
        if (etchedPrice !== null) {
          historyRecords.push({
            scryfall_id: scryfall_id,
            finish: 'etched',
            price: etchedPrice,
            price_at: new Date(),
            price_day: today
          })
        }
        
        // Insert price history records (only if there are any)
        if (historyRecords.length > 0) {
          await prisma.mtgcard_price_history.createMany({
            data: historyRecords,
            skipDuplicates: true
          })
        }
        
        priceHistoryEntries += historyRecords.length
        processedCount++
      }
      
      // Log progress every batch
      if (processedCount % 10000 === 0) {
        console.log(`[scryfall] Processed ${processedCount.toLocaleString()}/${totalCards.toLocaleString()} cards`)
      }
    }
    
    const durationMs = Date.now() - startTime
    console.log(`[scryfall] Simple price update completed:`)
    console.log(`- Cards processed: ${processedCount.toLocaleString()}`)
    console.log(`- Cards updated: ${updatedCards.toLocaleString()}`)
    console.log(`- Price history entries: ${priceHistoryEntries.toLocaleString()}`)
    console.log(`- Duration: ${durationMs}ms`)
    
    return {
      updated: processedCount,
      skipped: false,
      durationMs
    }
    
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    console.error('[scryfall] Simple price update failed:', error)
    
    return {
      updated: 0,
      skipped: true,
      durationMs
    }
  }
}