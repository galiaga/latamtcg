/* eslint-disable no-console */

// Local script: fetches a single card from Scryfall and adds it to the database.
// Similar to local-ingest-prices.ts but for individual cards.

import 'dotenv/config';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { indexSingleCard, rebuildSearchIndex } from '@/services/searchIndex';

// Get scryfall ID from command line args
const scryfallId = process.argv[2];

if (!scryfallId) {
  console.error('[local-ingest-card] Usage: tsx src/scripts/local-ingest-card.ts <scryfall-id>');
  console.error('[local-ingest-card] Example: tsx src/scripts/local-ingest-card.ts aac6ecc6-e5d7-40a3-b689-f4ed2d5c78cf');
  process.exit(1);
}

// Check if card already exists
async function checkExisting() {
  const existing = await prisma.mtgCard.findUnique({
    where: { scryfallId },
    select: { scryfallId: true, name: true, setCode: true }
  });
  return existing;
}

// Fetch card from Scryfall API
async function fetchCardFromScryfall(id: string) {
  const url = `https://api.scryfall.com/cards/${id}`;
  console.log(`[local-ingest-card] Fetching card from Scryfall: ${url}`);
  
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch card from Scryfall: ${response.status} ${response.statusText}`);
  }
  
  const card = await response.json();
  return card;
}

// Map Scryfall card to database format (similar to scryfallPrints.ts)
function mapToDb(card: any) {
  const priceUsd = card?.prices?.usd;
  const priceUsdFoil = card?.prices?.usd_foil;
  const priceUsdEtched = card?.prices?.usd_etched;
  const priceEur = card?.prices?.eur;
  const priceTix = card?.prices?.tix;
  
  return {
    scryfallId: String(card.id),
    oracleId: String(card?.oracle_id ?? ''),
    name: String(card.name ?? ''),
    flavorName: card?.flavor_name ? String(card.flavor_name) : null,
    setCode: String(card.set ?? ''),
    collectorNumber: String(card.collector_number ?? ''),
    rarity: card?.rarity ? String(card.rarity) : null,
    finishes: Array.isArray(card?.finishes) ? card.finishes.map((f: any) => String(f)) : [],
    frameEffects: Array.isArray(card?.frame_effects) ? card.frame_effects.map((f: any) => String(f)) : [],
    promoTypes: Array.isArray(card?.promo_types) ? card.promo_types.map((p: any) => String(p)) : [],
    borderColor: card?.border_color ? String(card.border_color) : null,
    fullArt: Boolean(card?.full_art ?? false),
    priceUsd: priceUsd ? new Prisma.Decimal(String(priceUsd)) : null,
    priceUsdFoil: priceUsdFoil ? new Prisma.Decimal(String(priceUsdFoil)) : null,
    priceUsdEtched: priceUsdEtched ? new Prisma.Decimal(String(priceUsdEtched)) : null,
    priceEur: priceEur ? String(priceEur) : null,
    priceTix: priceTix ? String(priceTix) : null,
    lang: String(card?.lang ?? 'en'),
    isPaper: true,
    setType: card?.set_type ? String(card.set_type) : null,
    releasedAt: card?.released_at ? new Date(card.released_at) : null,
    scryfallUpdatedAt: card?.updated_at ? new Date(card.updated_at) : null,
    priceUpdatedAt: new Date(),
  };
}

// Ensure Set exists
async function ensureSet(card: any) {
  await prisma.set.upsert({
    where: { set_code: String(card.set ?? '') },
    create: {
      set_code: String(card.set ?? ''),
      set_name: card?.set_name || String(card.set ?? ''),
      set_type: card?.set_type ? String(card.set_type) : null,
      released_at: card?.released_at ? new Date(card.released_at) : null,
    },
    update: {}, // Don't update if exists
  });
}

// Main ingestion function
async function ingestCard() {
  try {
    console.log(`[local-ingest-card] Starting ingestion for card: ${scryfallId}`);
    
    // Check if card already exists
    const existing = await checkExisting();
    if (existing) {
      console.log(`[local-ingest-card] ⚠️  Card already exists in database:`);
      console.log(`[local-ingest-card]    Name: ${existing.name}`);
      console.log(`[local-ingest-card]    Set: ${existing.setCode}`);
      console.log(`[local-ingest-card]    Scryfall ID: ${existing.scryfallId}`);
      console.log(`[local-ingest-card]`);
      console.log(`[local-ingest-card] Card exists but may not be in SearchIndex.`);
      console.log(`[local-ingest-card] Run 'npm run searchindex:rebuild' to add it to search.`);
      return;
    }
    
    // Fetch card from Scryfall
    const card = await fetchCardFromScryfall(scryfallId);
    console.log(`[local-ingest-card] ✅ Fetched card: ${card.name} (${card.set})`);
    
    // Ensure Set exists
    await ensureSet(card);
    console.log(`[local-ingest-card] ✅ Ensured Set exists: ${card.set}`);
    
    // Map and upsert card
    const mapped = mapToDb(card);
    const result = await prisma.mtgCard.upsert({
      where: { scryfallId: mapped.scryfallId },
      create: mapped,
      update: mapped,
    });
    
    console.log(`[local-ingest-card] ✅ Card upserted to database`);
    console.log(`[local-ingest-card]    Name: ${result.name}`);
    console.log(`[local-ingest-card]    Set: ${result.setCode}`);
    console.log(`[local-ingest-card]    Collector Number: ${result.collectorNumber}`);
    console.log(`[local-ingest-card]`);
    console.log(`[local-ingest-card] ⚠️  Card added to MtgCard table.`);
    console.log(`[local-ingest-card]    To make it searchable, run: npm run searchindex:rebuild`);
    console.log(`[local-ingest-card]    Or use: npm run ingest:card:local -- ${scryfallId} --reindex`);
    
  } catch (error) {
    console.error('[local-ingest-card] ❌ Error:', error);
    throw error;
  }
}

// Run with optional reindex flag
async function main() {
  const shouldReindex = process.argv.includes('--reindex');
  const shouldRebuildAll = process.argv.includes('--rebuild-all');
  
  await ingestCard();
  
  if (shouldRebuildAll) {
    console.log(`[local-ingest-card] Rebuilding entire search index (this may take a while)...`);
    const result = await rebuildSearchIndex();
    console.log(`[local-ingest-card] ✅ Search index rebuilt: ${result.inserted} items indexed`);
  } else if (shouldReindex) {
    console.log(`[local-ingest-card] Adding card to search index...`);
    const indexed = await indexSingleCard(scryfallId);
    if (indexed) {
      console.log(`[local-ingest-card] ✅ Card added to search index`);
    } else {
      console.log(`[local-ingest-card] ⚠️  Could not index card (card may not exist in database)`);
    }
  }
}

main()
  .catch((error) => {
    console.error('[local-ingest-card] Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

