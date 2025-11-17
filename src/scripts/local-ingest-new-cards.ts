/* eslint-disable no-console */

// Local script: automatically finds and ingests all new cards that should be in our database.
// Searches Scryfall for recently released cards and ensures we have all cards we're interested in.

import 'dotenv/config';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { indexSingleCard } from '@/services/searchIndex';
import { RELEASE_CUTOFF } from '@/lib/db/constants';

const SCRYFALL_SEARCH_URL = 'https://api.scryfall.com/cards/search';

// Configuration
const EXCLUDED_SET_TYPES = (process.env.SCRYFALL_EXCLUDE_SET_TYPES ?? 'token,memorabilia,alchemy,minigame')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const DAYS_BACK = Number(process.env.NEW_CARDS_DAYS_BACK || 60); // Look back 60 days by default
const BATCH_SIZE = 50; // Process cards in batches
const RATE_LIMIT_MS = 100; // 100ms between API calls

type ScryfallCard = {
  id: string;
  oracle_id: string;
  name: string;
  flavor_name?: string;
  set: string;
  set_name?: string;
  collector_number: string;
  rarity?: string;
  finishes?: string[];
  frame_effects?: string[];
  promo_types?: string[];
  border_color?: string;
  full_art?: boolean;
  prices: {
    usd?: string | null;
    usd_foil?: string | null;
    usd_etched?: string | null;
    eur?: string | null;
    tix?: string | null;
  };
  lang?: string;
  set_type?: string;
  released_at?: string;
  updated_at?: string;
  digital?: boolean;
  games?: string[];
};

type SearchResponse = {
  data: ScryfallCard[];
  has_more: boolean;
  next_page?: string;
  total_cards: number;
};

// Same filtering logic as scryfallIngest.ts
function shouldKeep(card: ScryfallCard): boolean {
  const isPaper = !card?.digital && Array.isArray(card?.games) && card.games.includes('paper');
  const isEnglish = card?.lang === 'en';
  const setType: string | undefined = card?.set_type;
  return isPaper && isEnglish && (!setType || !EXCLUDED_SET_TYPES.includes(setType));
}

// Map Scryfall card to database format
function mapToDb(card: ScryfallCard) {
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
async function ensureSet(card: ScryfallCard) {
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

// Process a batch of cards
async function processBatch(cards: ScryfallCard[], skipIndexing: boolean = false): Promise<{ inserted: number; updated: number; indexed: number; newCardIds: string[] }> {
  let inserted = 0;
  let updated = 0;
  let indexed = 0;

  // Filter cards we want to keep
  const filtered = cards.filter(shouldKeep);
  
  if (filtered.length === 0) {
    return { inserted: 0, updated: 0, indexed: 0, newCardIds: [] };
  }

  // Check which cards already exist - only process new ones
  const ids = filtered.map((c) => String(c.id));
  const existing = await prisma.mtgCard.findMany({
    where: { scryfallId: { in: ids } },
    select: { scryfallId: true },
  });
  const existingSet = new Set(existing.map((e) => e.scryfallId));

  // Debug: Check for specific card if in batch
  const targetCardId = 'd4bf05c4-a924-4006-835e-42f8468ba869';
  if (ids.includes(targetCardId)) {
    const inFiltered = filtered.some(c => String(c.id) === targetCardId);
    const inExisting = existingSet.has(targetCardId);
    console.log(`[local-ingest-new-cards] DEBUG: Card ${targetCardId}: inFiltered=${inFiltered}, inExisting=${inExisting}`);
  }

  // Filter to only new cards (skip existing ones)
  const newCards = filtered.filter((card) => !existingSet.has(String(card.id)));
  
  if (newCards.length === 0) {
    // All cards already exist - nothing to do
    return { inserted: 0, updated: 0, indexed: 0, newCardIds: [] };
  }

  // Ensure all sets exist before transaction (to avoid connection pool issues)
  const uniqueSets = new Map<string, ScryfallCard>();
  for (const card of newCards) {
    if (!uniqueSets.has(card.set)) {
      uniqueSets.set(card.set, card);
    }
  }
  for (const card of uniqueSets.values()) {
    await ensureSet(card);
  }

  // Process only new cards in transaction
  await prisma.$transaction(async (tx) => {
    for (const card of newCards) {
      const mapped = mapToDb(card);
      await tx.mtgCard.create({
        data: mapped,
      });
      inserted++;
    }
  }, { timeout: 120_000 });

  // Return new card IDs for batch indexing later (much faster than one-by-one)
  const newCardIds = newCards.map((card) => String(card.id));

  return { inserted, updated: 0, indexed: 0, newCardIds };
}

// Main function to find and ingest new cards
async function ingestNewCards(skipIndexing: boolean = false, setCode?: string) {
  const started = Date.now();
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalIndexed = 0;
  let totalProcessed = 0;
  let totalSkipped = 0;
  const allNewCardIds: string[] = []; // Collect all new card IDs for batch indexing

  try {
    // Calculate date range: from DAYS_BACK days ago to RELEASE_CUTOFF
    const daysAgo = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000);
    const startDate = daysAgo.toISOString().split('T')[0];
    const endDate = RELEASE_CUTOFF.toISOString().split('T')[0];

    // Build Scryfall query
    const excludedSetTypesQuery = EXCLUDED_SET_TYPES.map((t) => `-set:${t}`).join(' ');
    const baseQuery = `game:paper lang:en -is:digital ${excludedSetTypesQuery}`;
    
    let queries: string[] = [];
    let useSetSearchUri = false;
    
    if (setCode) {
      // If set code is provided, try to use the set's search_uri which includes extras and variations
      // This ensures we get ALL cards including special printings that might be filtered by regular search
      try {
        const setResponse = await fetch(`https://api.scryfall.com/sets/${setCode.toLowerCase()}`, {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store',
        });
        
        if (setResponse.ok) {
          const setData = await setResponse.json() as any;
          if (setData.search_uri) {
            // Use the set's search URI which includes extras and variations
            // The set search_uri is a full URL like: https://api.scryfall.com/cards/search?include_extras=true&include_variations=true&order=set&q=e%3Atla&unique=prints
            // We'll extract the base query and add our filters
            const setSearchUri = new URL(setData.search_uri);
            const existingQuery = setSearchUri.searchParams.get('q') || `e:${setCode}`;
            // Add our filters to the existing query
            const enhancedQuery = `${existingQuery} game:paper lang:en -is:digital ${excludedSetTypesQuery}`;
            queries = [enhancedQuery];
            useSetSearchUri = true;
            console.log(`[local-ingest-new-cards] Using set search URI for ${setCode} (includes extras/variations)`);
            console.log(`[local-ingest-new-cards] Set has ${setData.card_count || 'unknown'} total cards`);
            console.log(`[local-ingest-new-cards] Enhanced query: ${enhancedQuery.substring(0, 100)}...`);
          } else {
            // Fallback to regular search
            const setQuery = `set:${setCode} ${baseQuery}`;
            queries = [setQuery];
            console.log(`[local-ingest-new-cards] Searching for cards from set: ${setCode} (using regular search)`);
          }
        } else {
          // Fallback to regular search if set endpoint fails
          const setQuery = `set:${setCode} ${baseQuery}`;
          queries = [setQuery];
          console.log(`[local-ingest-new-cards] Searching for cards from set: ${setCode} (set endpoint failed, using regular search)`);
        }
      } catch (error) {
        // Fallback to regular search on error
        const setQuery = `set:${setCode} ${baseQuery}`;
        queries = [setQuery];
        console.log(`[local-ingest-new-cards] Searching for cards from set: ${setCode} (error fetching set info, using regular search)`);
      }
    } else {
      // Otherwise, search recent months
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-12
      
      // Build queries for recent months
      for (let i = 0; i < 3; i++) {
        const month = currentMonth - i;
        const year = month <= 0 ? currentYear - 1 : currentYear;
        const actualMonth = month <= 0 ? month + 12 : month;
        queries.push(`released:${year}-${String(actualMonth).padStart(2, '0')} ${baseQuery}`);
      }
      console.log(`[local-ingest-new-cards] Will search ${queries.length} recent months`);
    }
    
    if (setCode) {
      console.log(`[local-ingest-new-cards] ⚠️  Date filtering DISABLED when using --set flag`);
      console.log(`[local-ingest-new-cards]   Will ingest ALL cards from set ${setCode} regardless of release date`);
    } else {
      console.log(`[local-ingest-new-cards] Will filter to cards with release date between ${startDate} and ${endDate} (RELEASE_CUTOFF)`);
    }
    console.log(`[local-ingest-new-cards] Excluded set types: ${EXCLUDED_SET_TYPES.join(', ')}`);
    console.log('');

    let batch: ScryfallCard[] = [];

    // Search each query separately
    for (const query of queries) {
      console.log(`[local-ingest-new-cards] Searching: ${query.substring(0, 80)}...`);
      
      // If using set search URI, construct URL differently
      let url: string;
      if (useSetSearchUri && setCode) {
        // Use the set's search URI format with our enhanced query
        url = `${SCRYFALL_SEARCH_URL}?q=${encodeURIComponent(query)}&order=set&include_extras=true&include_variations=true&unique=prints`;
      } else {
        url = `${SCRYFALL_SEARCH_URL}?q=${encodeURIComponent(query)}&order=released`;
      }
      let pageCount = 0;

      while (url) {
        pageCount++;
        console.log(`[local-ingest-new-cards]   Fetching page ${pageCount}...`);
        
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) {
          // If 404, this month might have no cards - skip it
          if (response.status === 404) {
            console.log(`[local-ingest-new-cards]   No cards found for this month, skipping...`);
            break;
          }
          const errorText = await response.text().catch(() => '');
          console.error(`[local-ingest-new-cards]   Error response: ${errorText.substring(0, 500)}`);
          throw new Error(`Failed to fetch cards: ${response.status} ${response.statusText}`);
        }

        const result = await response.json() as SearchResponse;
        console.log(`[local-ingest-new-cards]   Found ${result.data.length} cards on this page`);

        // Filter cards by release date (only keep those between startDate and RELEASE_CUTOFF)
        // BUT: if setCode is specified, skip date filtering to get ALL cards from that set
        const filteredByDate = setCode 
          ? result.data // When setCode is specified, include all cards regardless of date
          : result.data.filter((card) => {
              if (!card.released_at) return false;
              const cardReleaseDate = new Date(card.released_at);
              const startDateObj = new Date(startDate);
              return cardReleaseDate >= startDateObj && cardReleaseDate <= RELEASE_CUTOFF;
            });

        // Add to batch
        batch.push(...filteredByDate);
        totalProcessed += result.data.length;

        // Process batch when it reaches BATCH_SIZE
        if (batch.length >= BATCH_SIZE) {
          const batchResult = await processBatch(batch, skipIndexing);
          totalInserted += batchResult.inserted;
          totalUpdated += batchResult.updated;
          totalIndexed += batchResult.indexed;
          allNewCardIds.push(...batchResult.newCardIds);
          const skipped = batch.length - batchResult.inserted;
          totalSkipped += skipped;
          
          if (batchResult.inserted > 0 || skipped < batch.length) {
            console.log(`[local-ingest-new-cards]   Processed batch: ${batchResult.inserted} new, ${skipped} already exist`);
          }
          batch = [];
        }

        // Get next page
        url = result.has_more ? result.next_page! : '';

        // Rate limiting
        if (url) {
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS));
        }
      }
    }

    // Process remaining cards in batch
    if (batch.length > 0) {
      const result = await processBatch(batch, skipIndexing);
      totalInserted += result.inserted;
      totalUpdated += result.updated;
      totalIndexed += result.indexed;
      allNewCardIds.push(...result.newCardIds);
      const skipped = batch.length - result.inserted;
      totalSkipped += skipped;
      
      if (result.inserted > 0 || skipped < batch.length) {
        console.log(`[local-ingest-new-cards]   Processed final batch: ${result.inserted} new, ${skipped} already exist`);
      }
    }

    // If using --set, also try to fetch any known missing cards by direct ID
    // This handles cases where Scryfall search doesn't return certain cards (e.g., special printings)
    if (setCode) {
      console.log('');
      console.log(`[local-ingest-new-cards] Note: Some cards may not appear in search results due to Scryfall API limitations.`);
      console.log(`[local-ingest-new-cards] If you know a specific card ID that should be in set ${setCode}, use: npm run ingest:card:local -- <card-id>`);
    }

    // Batch index all new cards at the end (much faster than one-by-one)
    if (!skipIndexing && allNewCardIds.length > 0) {
      console.log('');
      console.log(`[local-ingest-new-cards] Indexing ${allNewCardIds.length} new cards...`);
      const indexStart = Date.now();
      for (const cardId of allNewCardIds) {
        try {
          await indexSingleCard(cardId);
          totalIndexed++;
        } catch (err) {
          console.warn(`[local-ingest-new-cards] Failed to index card ${cardId}:`, err);
        }
      }
      const indexDuration = Date.now() - indexStart;
      console.log(`[local-ingest-new-cards] ✅ Indexed ${totalIndexed} cards in ${(indexDuration / 1000).toFixed(1)}s`);
    }

    const durationMs = Date.now() - started;
    console.log('');
    console.log(`[local-ingest-new-cards] ✅ Completed in ${(durationMs / 1000).toFixed(1)}s`);
    console.log(`[local-ingest-new-cards]   Total processed: ${totalProcessed}`);
    console.log(`[local-ingest-new-cards]   Inserted: ${totalInserted}`);
    console.log(`[local-ingest-new-cards]   Updated: ${totalUpdated}`);
    console.log(`[local-ingest-new-cards]   Indexed: ${totalIndexed}`);
    console.log(`[local-ingest-new-cards]   Skipped (already exist): ${totalSkipped}`);

  } catch (error) {
    console.error('[local-ingest-new-cards] ❌ Error:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const skipIndexing = process.argv.includes('--skip-index');
  const setCodeIndex = process.argv.findIndex((arg) => arg === '--set' || arg === '-s');
  const setCode = setCodeIndex >= 0 && setCodeIndex + 1 < process.argv.length 
    ? process.argv[setCodeIndex + 1] 
    : undefined;
  
  if (setCode) {
    console.log(`[local-ingest-new-cards] Set code specified: ${setCode}`);
    console.log(`[local-ingest-new-cards] Will only process cards from this set`);
  } else {
    console.log(`[local-ingest-new-cards] No set code specified - will search recent months`);
    console.log(`[local-ingest-new-cards] Use --set <code> to process a specific set (e.g., --set tle)`);
  }
  
  if (skipIndexing) {
    console.log('[local-ingest-new-cards] ⚠️  Indexing disabled (--skip-index flag)');
    console.log('[local-ingest-new-cards]   Run "npm run searchindex:rebuild" after ingestion to index all cards');
  }
  console.log('');

  await ingestNewCards(skipIndexing, setCode);
}

main()
  .catch((error) => {
    console.error('[local-ingest-new-cards] Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

