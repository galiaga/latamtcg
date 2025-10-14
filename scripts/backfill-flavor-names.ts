import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillFlavorNames() {
  console.log('Starting flavor name backfill...')
  
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
    
    // Process in small batches to avoid overwhelming the API
    const batchSize = 100
    let processed = 0
    let updated = 0
    
    while (processed < missingCount) {
      console.log(`Processing batch ${Math.floor(processed / batchSize) + 1}...`)
      
      // Get a batch of cards missing flavor names
      const cards = await prisma.mtgCard.findMany({
        where: { flavorName: null },
        select: { scryfallId: true, name: true },
        take: batchSize,
        skip: processed
      })
      
      for (const card of cards) {
        try {
          // Fetch individual card from Scryfall
          const response = await fetch(`https://api.scryfall.com/cards/${card.scryfallId}`)
          
          if (!response.ok) {
            console.log(`Failed to fetch ${card.name}: ${response.status}`)
            continue
          }
          
          const scryfallCard = await response.json()
          const flavorName = scryfallCard.flavor_name || null
          
          // Only update if we got a flavor name
          if (flavorName) {
            await prisma.mtgCard.update({
              where: { scryfallId: card.scryfallId },
              data: { flavorName }
            })
            updated++
            console.log(`✓ Updated ${card.name}: "${flavorName}"`)
          } else {
            console.log(`- No flavor name for ${card.name}`)
          }
          
          // Rate limiting: wait 100ms between requests
          await new Promise(resolve => setTimeout(resolve, 100))
          
        } catch (error) {
          console.log(`Error processing ${card.name}:`, error.message)
        }
      }
      
      processed += cards.length
      console.log(`Processed ${processed}/${missingCount} cards, updated ${updated} with flavor names`)
    }
    
    console.log(`\nBackfill completed!`)
    console.log(`- Processed: ${processed} cards`)
    console.log(`- Updated: ${updated} cards with flavor names`)
    
  } catch (error) {
    console.error('Backfill failed:', error)
  }
}

backfillFlavorNames()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
