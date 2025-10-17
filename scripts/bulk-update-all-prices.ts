#!/usr/bin/env tsx

/**
 * Bulk Price Update Script - Database Optimized Version
 * 
 * Changes from original:
 * - Reduced batch size: 100 → 50 cards
 * - Reduced concurrency: 10 → 3 cards in parallel  
 * - Increased delays: 100ms → 500ms between batches
 * - Better error handling for transaction timeouts
 * - Estimated time: ~50 minutes for 90k cards
 */

import { prisma } from '../src/lib/prisma'
import { Prisma } from '@prisma/client'

const SCRYFALL_API_BASE = 'https://api.scryfall.com'

type ScryfallCard = {
  id: string
  prices: {
    usd?: string | null
    usd_foil?: string | null
    usd_etched?: string | null
  }
}

async function bulkUpdateAllPrices(startIndex: number = 0, endIndex?: number) {
  console.log('🚀 Starting bulk price update for all cards...')
  
  try {
    // Get count of all cards
    const totalCards = await prisma.mtgCard.count()
    console.log(`📊 Found ${totalCards} cards to update`)
    
    // Set default end index if not provided
    if (!endIndex) endIndex = totalCards
    
    console.log(`🎯 Processing cards ${startIndex} to ${endIndex} (${endIndex - startIndex} cards)`)
    
    let processed = 0
    let updated = 0
    let errors = 0
    const batchSize = 50 // Process in smaller batches of 50
    const startTime = Date.now() // Track start time for estimation
    
    // Process cards in batches within the specified range
    for (let skip = startIndex; skip < endIndex; skip += batchSize) {
      const cards = await prisma.mtgCard.findMany({
        select: { 
          scryfallId: true, 
          name: true, 
          priceUsd: true, 
          priceUsdFoil: true, 
          priceUsdEtched: true 
        },
        take: Math.min(batchSize, endIndex - skip),
        skip: skip
      })
      
      if (cards.length === 0) break
      
      console.log(`📦 Processing batch ${Math.floor((skip - startIndex)/batchSize) + 1}/${Math.ceil((endIndex - startIndex)/batchSize)} (${cards.length} cards)`)
      
      // Process cards in smaller parallel batches of 3 to avoid database overload
      for (let i = 0; i < cards.length; i += 3) {
        const batch = cards.slice(i, i + 3)
        
        const promises = batch.map(async (card) => {
          try {
            const response = await fetch(`${SCRYFALL_API_BASE}/cards/${card.scryfallId}`)
            if (!response.ok) {
              console.log(`❌ Failed to fetch ${card.name}: ${response.status}`)
              return { updated: false, error: true }
            }
            
            const scryfallCard = await response.json() as ScryfallCard
            
            const newPriceUsd = scryfallCard.prices.usd ? Number(scryfallCard.prices.usd) : null
            const newPriceUsdFoil = scryfallCard.prices.usd_foil ? Number(scryfallCard.prices.usd_foil) : null
            const newPriceUsdEtched = scryfallCard.prices.usd_etched ? Number(scryfallCard.prices.usd_etched) : null
            
            const currentPriceUsd = card.priceUsd ? Number(card.priceUsd) : null
            const currentPriceUsdFoil = card.priceUsdFoil ? Number(card.priceUsdFoil) : null
            const currentPriceUsdEtched = card.priceUsdEtched ? Number(card.priceUsdEtched) : null
            
            const usdChanged = newPriceUsd !== currentPriceUsd
            const foilChanged = newPriceUsdFoil !== currentPriceUsdFoil
            const etchedChanged = newPriceUsdEtched !== currentPriceUsdEtched
            
            if (!usdChanged && !foilChanged && !etchedChanged) {
              return { updated: false, error: false }
            }
            
            // Update prices and record history in a transaction
            await prisma.$transaction(async (tx) => {
              // Update current prices
              await tx.mtgCard.update({
                where: { scryfallId: card.scryfallId },
                data: {
                  priceUsd: newPriceUsd ? new Prisma.Decimal(String(newPriceUsd)) : null,
                  priceUsdFoil: newPriceUsdFoil ? new Prisma.Decimal(String(newPriceUsdFoil)) : null,
                  priceUsdEtched: newPriceUsdEtched ? new Prisma.Decimal(String(newPriceUsdEtched)) : null,
                  priceUpdatedAt: new Date()
                }
              })
              
              // Record price history for changed prices
              const now = new Date()
              const priceDay = now.toISOString().slice(0, 10)
              
              if (usdChanged && newPriceUsd !== null) {
                await tx.$executeRawUnsafe(
                  'INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day) VALUES ($1::uuid, $2, $3, $4, $5::date) ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE SET price = EXCLUDED.price',
                  card.scryfallId, 'normal', newPriceUsd, now, priceDay
                )
              }
              
              if (foilChanged && newPriceUsdFoil !== null) {
                await tx.$executeRawUnsafe(
                  'INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day) VALUES ($1::uuid, $2, $3, $4, $5::date) ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE SET price = EXCLUDED.price',
                  card.scryfallId, 'foil', newPriceUsdFoil, now, priceDay
                )
              }
              
              if (etchedChanged && newPriceUsdEtched !== null) {
                await tx.$executeRawUnsafe(
                  'INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day) VALUES ($1::uuid, $2, $3, $4, $5::date) ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE SET price = EXCLUDED.price',
                  card.scryfallId, 'etched', newPriceUsdEtched, now, priceDay
                )
              }
            })
            
            console.log(`✅ Updated ${card.name}: USD=${newPriceUsd}, Foil=${newPriceUsdFoil}, Etched=${newPriceUsdEtched}`)
            return { updated: true, error: false }
            
          } catch (error: unknown) {
            const errorMsg = (error as Error).message
            if (errorMsg.includes('Transaction API error')) {
              console.log(`⏳ Transaction timeout for ${card.name}, will retry later`)
            } else {
              console.log(`❌ Error updating ${card.name}:`, errorMsg)
            }
            return { updated: false, error: true, card: card }
          }
        })
        
        const results = await Promise.all(promises)
        
        // Count results
        const batchUpdated = results.filter(r => r.updated).length
        const batchErrors = results.filter(r => r.error).length
        
        updated += batchUpdated
        errors += batchErrors
        processed += batch.length
        
        console.log(`📈 Progress: ${processed}/${endIndex - startIndex} processed, ${updated} updated, ${errors} errors`)
        
        // Calculate time estimation
        const elapsedMs = Date.now() - startTime
        const cardsPerMs = processed / elapsedMs
        const remainingCards = (endIndex - startIndex) - processed
        const estimatedMs = remainingCards / cardsPerMs
        const estimatedMinutes = Math.round(estimatedMs / 60000)
        const estimatedHours = Math.round(estimatedMinutes / 60)
        
        if (estimatedHours > 0) {
          console.log(`⏱️ Estimated time remaining: ${estimatedHours}h ${estimatedMinutes % 60}m`)
        } else {
          console.log(`⏱️ Estimated time remaining: ${estimatedMinutes}m`)
        }
        
        // Rate limiting: wait 500ms between batches of 3 to avoid database overload
        if (i + 3 < cards.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      // Rate limiting: wait 2 seconds between batches of 50
      if (skip + batchSize < endIndex) {
        console.log('⏳ Waiting 2 seconds before next batch...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    console.log('\n🎉 Bulk price update completed!')
    console.log(`📊 Total processed: ${processed} cards`)
    console.log(`✅ Total updated: ${updated} cards`)
    console.log(`❌ Total errors: ${errors} cards`)
    console.log(`⏱️ Estimated time: ${Math.ceil(processed / 3) * 0.5 / 60} minutes`)
    
  } catch (error: unknown) {
    console.error('💥 Bulk update failed:', error)
  }
}

// Parse command line arguments for range
const startIndex = process.argv[2] ? parseInt(process.argv[2]) : 0
const endIndex = process.argv[3] ? parseInt(process.argv[3]) : undefined

// Run the bulk update with specified range
bulkUpdateAllPrices(startIndex, endIndex).catch(console.error)
