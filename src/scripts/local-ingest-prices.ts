/* eslint-disable no-console */

// Local fallback script: runs from your machine but connects to production database.

// This script DIRECTLY UPDATES production price data.

// Allow insecure SSL for Scryfall API fetch calls (local network issue workaround).

// This must be set before any imports that use TLS/HTTPS.

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

}



import 'dotenv/config';

import { Client } from 'pg';

import { pipeline } from 'node:stream';

import { Writable } from 'node:stream';

import { promisify } from 'node:util';

import { setTimeout as sleep } from 'node:timers/promises';

import { fetch } from 'node-fetch-native';

import { parser } from 'stream-json';

import { streamArray } from 'stream-json/streamers/StreamArray';

import * as fs from 'node:fs';

import * as path from 'node:path';



// Log warning after console is available via imports

console.warn('[ssl] ⚠️  TLS certificate verification disabled for Scryfall API fetch calls (local network workaround)');



const pipe = promisify(pipeline);



// ------------ Config ------------

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {

  console.error('[config] Missing DATABASE_URL');

  process.exit(1);

}



// ------------ SSL Config ------------

function getSSLConfig() {

  // Check if Supabase CA certificate is available

  const supabaseCaPem = process.env.SUPABASE_CA_PEM;

  

  if (supabaseCaPem) {

    console.log('[ssl] Using Supabase CA certificate from SUPABASE_CA_PEM environment variable');

    return {

      rejectUnauthorized: true,

      ca: supabaseCaPem

    };

  }

  

  // Check for local certificate file

  const certPath = path.join(process.cwd(), 'supabase-ca.pem');

  if (fs.existsSync(certPath)) {

    console.log('[ssl] Using Supabase CA certificate from local file');

    return {

      rejectUnauthorized: true,

      ca: fs.readFileSync(certPath, 'utf8')

    };

  }

  

  // Fallback: Log warning and use insecure mode

  console.warn('[ssl] ⚠️  WARNING: No Supabase CA certificate found!');

  console.warn('[ssl] ⚠️  Using insecure SSL mode for database connection.');

  console.warn('[ssl] ⚠️  To secure: Download Supabase CA certificate and set SUPABASE_CA_PEM environment variable');

  console.warn('[ssl] ⚠️  This script updates PRODUCTION data - consider using secure SSL.');

  

  return {

    rejectUnauthorized: false // Insecure fallback

  };

}



const DATASET = (process.env.SCRYFALL_BULK_DATASET ?? 'default_cards').toLowerCase();

if (!['default_cards', 'unique_prints'].includes(DATASET)) {

  console.error('[config] Invalid SCRYFALL_BULK_DATASET (use default_cards|unique_prints)');

  process.exit(1);

}

const PAPER_ONLY = String(process.env.SCRYFALL_FILTER_PAPER_ONLY ?? 'true').toLowerCase() === 'true';

const BATCH_SIZE = 5_000;



// ------------ Helpers ------------

function todayISO(): string {

  const d = new Date();

  const y = d.getFullYear();

  const m = String(d.getMonth() + 1).padStart(2, '0');

  const day = String(d.getDate()).padStart(2, '0');

  return `${y}-${m}-${day}`;

}



type StageRow = {

  scryfall_id: string;

  price_usd: number | null;

  price_usd_foil: number | null;

  price_usd_etched: number | null;

  price_day: string; // YYYY-MM-DD

};



// ------------ Core ------------

async function resolveBulkUrl(): Promise<{ downloadUri: string; updatedAt?: string }> {

  const res = await fetch('https://api.scryfall.com/bulk-data');

  if (!res.ok) throw new Error(`bulk-data fetch failed: ${res.status}`);

  const json: any = await res.json();

  const item = (json?.data ?? []).find((d: any) => d.type === DATASET);

  if (!item?.download_uri) throw new Error(`bulk-data: dataset ${DATASET} not found`);

  return { downloadUri: item.download_uri, updatedAt: item.updated_at };

}



async function streamJsonToStage(

  downloadUri: string,

  paperOnly: boolean,

  priceDayISO: string,

  pushBatch: (rows: StageRow[]) => Promise<void>

) {

  const res = await fetch(downloadUri);

  if (!res.ok) throw new Error(`download bulk json failed: ${res.status}`);



  let totalJSON = 0;

  let totalStaged = 0;

  let filteredOut = 0;



  const batch: StageRow[] = [];



  const sink = new Writable({

    objectMode: true,

    async write({ value }: any, _enc, cb) {

      try {

        totalJSON++;



        if (paperOnly) {

          const games: string[] | undefined = value?.games;

          if (!games || !games.includes('paper')) {

            filteredOut++;

            return cb();

          }

        }



        const id: string | undefined = value?.id;

        if (!id) return cb();



        const p = value?.prices ?? {};

        const price_usd = p.usd ? Number(p.usd) : null;

        const price_usd_foil = p.usd_foil ? Number(p.usd_foil) : null;

        const price_usd_etched = p.usd_etched ? Number(p.usd_etched) : null;



        batch.push({

          scryfall_id: id,

          price_usd,

          price_usd_foil,

          price_usd_etched,

          price_day: priceDayISO,

        });



        if (batch.length >= BATCH_SIZE) {

          await pushBatch(batch.splice(0, batch.length));

          totalStaged += BATCH_SIZE;

          if (totalStaged % (BATCH_SIZE * 2) === 0) {

            console.log(`[stage] Inserted ${totalStaged}...`);

          }

        }

        cb();

      } catch (e) { cb(e as Error); }

    }

  });



  await pipe(

    res.body as any,

    parser(),

    streamArray(),

    sink

  );



  if (batch.length > 0) {

    await pushBatch(batch);

    totalStaged += batch.length;

  }

  return { totalJSON, totalStaged, filteredOut };

}



async function run() {

  console.log('[local] Starting local fallback Scryfall price ingest…');

  console.log('[local] ⚠️  NOTE: This script updates PRODUCTION database via DATABASE_URL');

  const started = Date.now();

  const priceDay = todayISO();



  const { downloadUri, updatedAt } = await resolveBulkUrl();

  console.log(`[local] dataset=${DATASET} paperOnly=${PAPER_ONLY}`);

  console.log(`[local] bulkUri=${downloadUri}`);

  if (updatedAt) console.log(`[local] scryfall.updated_at=${updatedAt}`);



  // Use same SSL configuration pattern as other scripts

  const sslConfig = getSSLConfig();

  const client = new Client({ connectionString: DATABASE_URL, ssl: sslConfig });

  await client.connect();



  try {

    // Ensure staging exists and is empty

    await client.query('BEGIN');

    await client.query(`

      CREATE TABLE IF NOT EXISTS public.scryfall_daily_prices_stage (

        scryfall_id uuid PRIMARY KEY,

        price_usd numeric(10,2),

        price_usd_foil numeric(10,2),

        price_usd_etched numeric(10,2),

        price_day date NOT NULL

      )

    `);

    await client.query('TRUNCATE TABLE public.scryfall_daily_prices_stage');

    await client.query('COMMIT');



    const pushBatch = async (rows: StageRow[]) => {

      if (rows.length === 0) return;

      const values: any[] = [];

      const placeholders: string[] = [];

      rows.forEach((r, i) => {

        const base = i * 5;

        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);

        values.push(r.scryfall_id, r.price_usd, r.price_usd_foil, r.price_usd_etched, r.price_day);

      });

      const sql = `

        INSERT INTO public.scryfall_daily_prices_stage (scryfall_id, price_usd, price_usd_foil, price_usd_etched, price_day)

        VALUES ${placeholders.join(',')}

        ON CONFLICT (scryfall_id) DO UPDATE SET

          price_usd = EXCLUDED.price_usd,

          price_usd_foil = EXCLUDED.price_usd_foil,

          price_usd_etched = EXCLUDED.price_usd_etched,

          price_day = EXCLUDED.price_day

      `;

      await client.query(sql, values);

    };



    console.log('[stage] Streaming JSON → staging…');

    const { totalJSON, totalStaged, filteredOut } =

      await streamJsonToStage(downloadUri, PAPER_ONLY, priceDay, pushBatch);

    console.log(`[stage] done: json=${totalJSON} staged=${totalStaged} filtered=${filteredOut}`);



    // Update MtgCard only where values change

    console.log('[update] Updating MtgCard current prices…');

    const upd = await client.query(`

      WITH s AS (

        SELECT scryfall_id::text AS sid, price_usd, price_usd_foil, price_usd_etched

        FROM public.scryfall_daily_prices_stage

      )

      UPDATE public."MtgCard" c

      SET

        "priceUsd" = s.price_usd,

        "priceUsdFoil" = s.price_usd_foil,

        "priceUsdEtched" = s.price_usd_etched,

        "priceUpdatedAt" = NOW()

      FROM s

      WHERE c."scryfallId" = s.sid

        AND (

          c."priceUsd" IS DISTINCT FROM s.price_usd OR

          c."priceUsdFoil" IS DISTINCT FROM s.price_usd_foil OR

          c."priceUsdEtched" IS DISTINCT FROM s.price_usd_etched

        )

    `);

    console.log(`[update] MtgCard rows updated: ${upd.rowCount ?? 0}`);



    // Upsert current price table: nonfoil/foil/etched

    console.log('[current] Upserting mtgcard_current_price…');

    const upNon = await client.query(`

      INSERT INTO public.mtgcard_current_price (scryfall_id, finish, price, price_at, source)

      SELECT scryfall_id, 'nonfoil', price_usd, NOW(), 'scryfall'

      FROM public.scryfall_daily_prices_stage

      WHERE price_usd IS NOT NULL

      ON CONFLICT (scryfall_id, finish)

      DO UPDATE SET price = EXCLUDED.price, price_at = EXCLUDED.price_at, source = 'scryfall'

    `);

    const upFoil = await client.query(`

      INSERT INTO public.mtgcard_current_price (scryfall_id, finish, price, price_at, source)

      SELECT scryfall_id, 'foil', price_usd_foil, NOW(), 'scryfall'

      FROM public.scryfall_daily_prices_stage

      WHERE price_usd_foil IS NOT NULL

      ON CONFLICT (scryfall_id, finish)

      DO UPDATE SET price = EXCLUDED.price, price_at = EXCLUDED.price_at, source = 'scryfall'

    `);

    const upEtched = await client.query(`

      INSERT INTO public.mtgcard_current_price (scryfall_id, finish, price, price_at, source)

      SELECT scryfall_id, 'etched', price_usd_etched, NOW(), 'scryfall'

      FROM public.scryfall_daily_prices_stage

      WHERE price_usd_etched IS NOT NULL

      ON CONFLICT (scryfall_id, finish)

      DO UPDATE SET price = EXCLUDED.price, price_at = EXCLUDED.price_at, source = 'scryfall'

    `);

    console.log(`[current] upserts nonfoil=${upNon.rowCount ?? 0} foil=${upFoil.rowCount ?? 0} etched=${upEtched.rowCount ?? 0}`);



    const dur = Date.now() - started;

    console.log('-----------------------------------------------');

    console.log('[local] Ingest OK');

    console.log(`- dataset: ${DATASET}`);

    console.log(`- paperOnly: ${PAPER_ONLY}`);

    console.log(`- price_day: ${priceDay}`);

    console.log(`- json_count: ${totalJSON}`);

    console.log(`- staged: ${totalStaged}`);

    console.log(`- filtered_out: ${filteredOut}`);

    console.log(`- mtgcard_updated: ${upd.rowCount ?? 0}`);

    console.log(`- current_price_upserts: ${(upNon.rowCount ?? 0) + (upFoil.rowCount ?? 0) + (upEtched.rowCount ?? 0)}`);

    console.log(`- duration_ms: ${dur}`);

    console.log('-----------------------------------------------');

  } finally {

    try { await client.end(); } catch {}

  }

}



run().catch(async (err) => {

  console.error('[local] ERROR:', err?.message || err);

  await sleep(100);

  process.exit(1);

});

