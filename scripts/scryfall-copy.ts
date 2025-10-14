 
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { Client } from 'pg'
import { prisma } from '../src/lib/prisma'

const KV_KEY_COPY = 'scryfall:default:copy'
const KV_KEY_NDJSON = 'scryfall:default:ndjson'

async function getKv(key: string): Promise<string | null> {
  const row = await prisma.kvMeta.findUnique({ where: { key } })
  return row?.value ?? null
}

async function upsertKv(key: string, value: string): Promise<void> {
  await prisma.kvMeta.upsert({ where: { key }, update: { value }, create: { key, value } })
}

async function ensureStaging(pg: Client) {
  await pg.query(`
    CREATE UNLOGGED TABLE IF NOT EXISTS mtgcard_staging (
      scryfall_id text PRIMARY KEY,
      oracle_id text,
      name text NOT NULL,
      set_code text NOT NULL,
      set_name text,
      collector_number text NOT NULL,
      rarity text,
      finishes text[],
      frame_effects text[],
      promo_types text[],
      border_color text,
      full_art boolean,
      -- image URL dropped; computed on the fly from scryfall_id
      legalities_json jsonb,
      price_usd numeric(10,2),
      price_usd_foil numeric(10,2),
      price_usd_etched numeric(10,2),
      price_eur numeric(10,2),
      price_tix numeric(10,2),
      lang text,
      is_paper boolean,
      set_type text,
      released_at timestamptz,
      scryfall_updated_at timestamptz
    );
  `)
}

async function copyPart(pg: Client, partPath: string) {
  // Use \\copy via psql would be simpler, but we stick to pg client and jsonb_to_recordset
  const jsonLines = fs.readFileSync(partPath, 'utf8').split('\n').filter(Boolean)
  // Insert in chunks to avoid giant single statement
  const chunkSize = 10_000
  for (let i = 0; i < jsonLines.length; i += chunkSize) {
    const slice = jsonLines.slice(i, i + chunkSize)
    const values = slice.map((l) => JSON.parse(l))
    // Create a temp table and insert rows
    await pg.query('CREATE TEMP TABLE tmp_json (doc jsonb) ON COMMIT DROP;')
    const insertParams: any[] = []
    const valuesSql = values.map((_, idx) => {
      insertParams.push(JSON.stringify(values[idx]))
      return `($${idx + 1}::jsonb)`
    }).join(',')
    await pg.query(`INSERT INTO tmp_json (doc) VALUES ${valuesSql};`, insertParams)
    await pg.query(`
      INSERT INTO mtgcard_staging (
        scryfall_id, oracle_id, name, set_code, set_name, collector_number,
        rarity, finishes, frame_effects, promo_types, border_color, full_art,
        image_normal_url, legalities_json, price_usd, price_usd_foil, price_usd_etched,
        price_eur, price_tix, lang, is_paper, set_type, released_at, scryfall_updated_at
      )
      SELECT
        (doc->>'scryfallId'),
        (doc->>'oracleId'),
        (doc->>'name'),
        (doc->>'setCode'),
        (doc->>'setName'),
        (doc->>'collectorNumber'),
        (doc->>'rarity'),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(doc->'finishes')), '{}')::text[],
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(doc->'frameEffects')), '{}')::text[],
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(doc->'promoTypes')), '{}')::text[],
        (doc->>'borderColor'),
        (doc->>'fullArt')::boolean,
        NULL,
        doc->'legalitiesJson',
        NULLIF(doc->>'priceUsd','')::numeric,
        NULLIF(doc->>'priceUsdFoil','')::numeric,
        NULLIF(doc->>'priceUsdEtched','')::numeric,
        NULLIF(doc->>'priceEur','')::numeric,
        NULLIF(doc->>'priceTix','')::numeric,
        (doc->>'lang'),
        COALESCE((doc->>'isPaper')::boolean, true),
        (doc->>'setType'),
        NULLIF(doc->>'releasedAt','')::timestamptz,
        NULLIF(doc->>'scryfallUpdatedAt','')::timestamptz
      FROM tmp_json;
    `)
  }
}

async function mergeIntoFinal(pg: Client) {
  // Upsert price history for rows where prices changed (compare staging vs current)
  await pg.query(`
    INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day)
    SELECT s.scryfall_id::uuid, 'normal', s.price_usd, NOW(), (NOW() AT TIME ZONE 'UTC')::date
    FROM mtgcard_staging s
    JOIN "MtgCard" m ON m."scryfallId" = s.scryfall_id
    WHERE s.price_usd IS NOT NULL AND s.price_usd IS DISTINCT FROM m."priceUsd"
    ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE SET price = EXCLUDED.price;

    INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day)
    SELECT s.scryfall_id::uuid, 'foil', s.price_usd_foil, NOW(), (NOW() AT TIME ZONE 'UTC')::date
    FROM mtgcard_staging s
    JOIN "MtgCard" m ON m."scryfallId" = s.scryfall_id
    WHERE s.price_usd_foil IS NOT NULL AND s.price_usd_foil IS DISTINCT FROM m."priceUsdFoil"
    ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE SET price = EXCLUDED.price;

    INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day)
    SELECT s.scryfall_id::uuid, 'etched', s.price_usd_etched, NOW(), (NOW() AT TIME ZONE 'UTC')::date
    FROM mtgcard_staging s
    JOIN "MtgCard" m ON m."scryfallId" = s.scryfall_id
    WHERE s.price_usd_etched IS NOT NULL AND s.price_usd_etched IS DISTINCT FROM m."priceUsdEtched"
    ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE SET price = EXCLUDED.price;
  `)

  await pg.query(`
    INSERT INTO "MtgCard" (
      "scryfallId", "oracleId", "name", "setCode", "setName", "collectorNumber",
      "rarity", "finishes", "frameEffects", "promoTypes", "borderColor", "fullArt",
      "legalitiesJson", "priceUsd", "priceUsdFoil", "priceUsdEtched",
      "priceEur", "priceTix", "lang", "isPaper", "setType", "releasedAt", "scryfallUpdatedAt"
    )
    SELECT
      scryfall_id, oracle_id, name, set_code, set_name, collector_number,
      rarity, finishes, frame_effects, promo_types, border_color, full_art,
      legalities_json, price_usd, price_usd_foil, price_usd_etched,
      price_eur, price_tix, lang, is_paper, set_type, released_at, scryfall_updated_at
    FROM mtgcard_staging
    ON CONFLICT ("scryfallId") DO UPDATE SET
      "oracleId" = EXCLUDED."oracleId",
      "name" = EXCLUDED."name",
      "setCode" = EXCLUDED."setCode",
      "setName" = EXCLUDED."setName",
      "collectorNumber" = EXCLUDED."collectorNumber",
      "rarity" = EXCLUDED."rarity",
      "finishes" = EXCLUDED."finishes",
      "frameEffects" = EXCLUDED."frameEffects",
      "promoTypes" = EXCLUDED."promoTypes",
      "borderColor" = EXCLUDED."borderColor",
      "fullArt" = EXCLUDED."fullArt",
      -- image column removed
      "legalitiesJson" = EXCLUDED."legalitiesJson",
      "priceUsd" = CASE WHEN EXCLUDED."priceUsd" IS DISTINCT FROM "MtgCard"."priceUsd" THEN EXCLUDED."priceUsd" ELSE "MtgCard"."priceUsd" END,
      "priceUsdFoil" = CASE WHEN EXCLUDED."priceUsdFoil" IS DISTINCT FROM "MtgCard"."priceUsdFoil" THEN EXCLUDED."priceUsdFoil" ELSE "MtgCard"."priceUsdFoil" END,
      "priceUsdEtched" = CASE WHEN EXCLUDED."priceUsdEtched" IS DISTINCT FROM "MtgCard"."priceUsdEtched" THEN EXCLUDED."priceUsdEtched" ELSE "MtgCard"."priceUsdEtched" END,
      "priceUpdatedAt" = CASE WHEN EXCLUDED."priceUsd" IS DISTINCT FROM "MtgCard"."priceUsd"
                                OR EXCLUDED."priceUsdFoil" IS DISTINCT FROM "MtgCard"."priceUsdFoil"
                                OR EXCLUDED."priceUsdEtched" IS DISTINCT FROM "MtgCard"."priceUsdEtched"
                              THEN NOW() ELSE "MtgCard"."priceUpdatedAt" END,
      "priceEur" = EXCLUDED."priceEur",
      "priceTix" = EXCLUDED."priceTix",
      "lang" = EXCLUDED."lang",
      "isPaper" = EXCLUDED."isPaper",
      "setType" = EXCLUDED."setType",
      "releasedAt" = EXCLUDED."releasedAt",
      "scryfallUpdatedAt" = EXCLUDED."scryfallUpdatedAt";
  `)

  await pg.query('TRUNCATE mtgcard_staging')
  await pg.query('ANALYZE "MtgCard"')
}

async function main() {
  try {
    const dataDir = path.resolve('data')
    const ndjsonDir = path.join(dataDir, 'ndjson')
    const metaPath = path.join(dataDir, 'scryfall-download.meta.json')
    if (!fs.existsSync(metaPath)) throw new Error('Missing download meta; run scryfall:download first')
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as { updatedAt: string; etag: string | null }

    const copyKv = await getKv(KV_KEY_COPY)
    let lastPart = -1
    if (copyKv) {
      try {
        const parsed = JSON.parse(copyKv) as { updatedAt?: string; etag?: string | null; lastPart?: number }
        if (parsed.updatedAt === meta.updatedAt && parsed.etag === meta.etag && typeof parsed.lastPart === 'number') {
          lastPart = parsed.lastPart
        }
      } catch {}
    }

    const pgClient = new Client({ connectionString: process.env.DATABASE_URL })
    await pgClient.connect()
    await ensureStaging(pgClient)

    const parts = fs.readdirSync(ndjsonDir)
      .filter((f) => f.startsWith('part-') && f.endsWith('.ndjson'))
      .sort()

    for (const part of parts) {
      const idx = Number(part.match(/part-(\d+)\.ndjson/)?.[1] ?? '-1')
      if (idx <= lastPart) continue
      const full = path.join(ndjsonDir, part)
      console.log('[scryfall] COPY part', part)
      await copyPart(pgClient, full)
      await upsertKv(KV_KEY_COPY, JSON.stringify({ updatedAt: meta.updatedAt, etag: meta.etag, lastPart: idx }))
    }

    console.log('[scryfall] Merging staging into MtgCard')
    await mergeIntoFinal(pgClient)
    await pgClient.end()
    console.log('[scryfall] COPY + merge complete')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()



