import { PrismaClient } from '@prisma/client'
import { createReadStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Transform } from 'stream'
import { parse } from 'ndjson'

const prisma = new PrismaClient()

async function fastBackfillFlavorNames() {
  console.log('Starting fast flavor name backfill using bulk data...')
  
  try {
    // Get count of cards missing flavor names
    const missingCount = await prisma.mtgCard.count({
      where: { flavorName: null }
    })
    
    console.log(`Found ${missingCount} cards missing flavor names`)
    
    if (missingCount === 0) {
      console.log('All cards already have flavor names. Nothing to do.')
      return
    }
    
    // Download the latest bulk data
    console.log('Fetching bulk data info...')
    const bulkResponse = await fetch('https://api.scryfall.com/bulk-data')
    const bulkData = await bulkResponse.json()
    const defaultCards = bulkData.data.find((b: any) => b.type === 'default_cards')
    
    if (!defaultCards) {
      throw new Error('Could not find default_cards in bulk data')
    }
    
    console.log('Downloading bulk data...')
    const cardsResponse = await fetch(defaultCards.download_uri)
    const cardsData = await cardsResponse.json()
    
    console.log(`Processing ${cardsData.length} cards from bulk data...`)
    
    // Create a map of scryfallId -> flavor_name for fast lookup
    const flavorMap = new Map<string, string>()
    
    for (const card of cardsData) {
      if (card.flavor_name) {
        flavorMap.set(card.id, card.flavor_name)
      }
    }
    
    console.log(`Found ${flavorMap.size} cards with flavor names in bulk data`)
    
    // Get all cards missing flavor names
    const cardsToUpdate = await prisma.mtgCard.findMany({
      where: { flavorName: null },
      select: { scryfallId: true, name: true }
    })
    
    console.log(`Checking ${cardsToUpdate.length} cards for flavor names...`)
    
    let updated = 0
    const batchUpdates: Array<{ scryfallId: string; flavorName: string }> = []
    
    for (const card of cardsToUpdate) {
      const flavorName = flavorMap.get(card.scryfallId)
      if (flavorName) {
        batchUpdates.push({ scryfallId: card.scryfallId, flavorName })
        updated++
        console.log(`✓ Found flavor name for ${card.name}: "${flavorName}"`)
      }
    }
    
    // Batch update all cards with flavor names
    if (batchUpdates.length > 0) {
      console.log(`\nUpdating ${batchUpdates.length} cards in database...`)
      
      for (const update of batchUpdates) {
        await prisma.mtgCard.update({
          where: { scryfallId: update.scryfallId },
          data: { flavorName: update.flavorName }
        })
      }
    }
    
    console.log(`\nFast backfill completed!`)
    console.log(`- Processed: ${cardsToUpdate.length} cards`)
    console.log(`- Updated: ${updated} cards with flavor names`)
    
  } catch (error) {
    console.error('Backfill failed:', error)
  }
}

fastBackfillFlavorNames()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
