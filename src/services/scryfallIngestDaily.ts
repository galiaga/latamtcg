"use server"
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { Transform } from 'node:stream'
import { chain } from 'stream-chain'
import { parser } from 'stream-json'
import { streamArray } from 'stream-json/streamers/StreamArray'

const KV_KEY_LAST_UPDATE = 'scryfall.daily_update.last_run'

type DailyUpdateSummary = {
  updated: number
  skipped: boolean
  durationMs: number
}

type BulkDataInfo = {
  object: string
  id: string
  uri: string
  type: string
  name: string
  description: string
  download_uri: string
  updated_at: string
  content_type: string
  content_encoding: string
  size: number
}

async function fetchBulkDataInfo(): Promise<BulkDataInfo> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'latamtcg-daily-update/1.0',
        'Accept': 'application/json'
      }
    }
    
    https.get('https://api.scryfall.com/bulk-data', options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          
          if (!response.data || !Array.isArray(response.data)) {
            reject(new Error('Invalid API response: missing data array'))
            return
          }
          
          const defaultCards = response.data.find((item: any) => item.type === 'default_cards')
          if (!defaultCards) {
            reject(new Error('default_cards bulk data not found'))
            return
          }
          resolve(defaultCards)
        } catch (err) {
          reject(err)
        }
      })
    }).on('error', reject)
  })
}

async function downloadBulkData(downloadUri: string, outputPath: string): Promise<void> {
  console.log('[scryfall] Downloading latest bulk data...')
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath)
    const options = {
      headers: {
        'User-Agent': 'latamtcg-daily-update/1.0',
        'Accept': 'application/json'
      }
    }
    
    https.get(downloadUri, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
        return
      }
      
      // Stream directly to file - Scryfall bulk data is uncompressed JSON
      res.pipe(file)
      
      file.on('finish', () => {
        console.log('[scryfall] Download completed')
        resolve()
      })
      
      file.on('error', reject)
    }).on('error', reject)
  })
}

async function generatePricesCsv(bulkDataPath: string): Promise<string> {
  const csvPath = path.join(process.cwd(), 'data', 'daily-prices.csv')
  const now = new Date()
  const priceDay = now.toISOString().slice(0, 10)
  
  console.log('[scryfall] Generating CSV from bulk data...')
  
  const writeStream = fs.createWriteStream(csvPath)
  
  // Write CSV header
  writeStream.write('scryfall_id,price_usd,price_usd_foil,price_usd_etched,price_day\n')
  
  // Create a Transform stream for data processing
  const dataProcessor = new Transform({
    objectMode: true,
    transform(data: any, encoding, callback) {
      const card = data.value
      const usd = card.prices?.usd || ''
      const usdFoil = card.prices?.usd_foil || ''
      const usdEtched = card.prices?.usd_etched || ''
      
      // Only emit if at least one price exists
      if (usd || usdFoil || usdEtched) {
        writeStream.write(`${card.id},${usd},${usdFoil},${usdEtched},${priceDay}\n`)
      }
      
      callback()
    }
  })

  const streamPipeline = chain([
    fs.createReadStream(bulkDataPath),
    parser(),
    streamArray(),
    dataProcessor
  ])
  
  return new Promise((resolve, reject) => {
    streamPipeline.on('error', reject)
    streamPipeline.on('end', () => {
      writeStream.end()
      writeStream.on('finish', () => resolve(csvPath))
    })
  })
}

async function importPricesFromCsv(csvPath: string): Promise<number> {
  console.log('[scryfall] Importing prices from CSV...')
  
  // Create staging table and import data
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS prices_staging (
      scryfall_id text PRIMARY KEY,
      price_usd numeric,
      price_usd_foil numeric,
      price_usd_etched numeric,
      price_day date NOT NULL
    )
  `
  
  // Read CSV and insert into staging table
  const csvContent = fs.readFileSync(csvPath, 'utf8')
  const lines = csvContent.split('\n').slice(1) // Skip header
  
  let importedCount = 0
  for (const line of lines) {
    if (line.trim()) {
      const [scryfall_id, price_usd, price_usd_foil, price_usd_etched, price_day] = line.split(',')
      if (scryfall_id) {
        await prisma.$executeRaw`
          INSERT INTO prices_staging (scryfall_id, price_usd, price_usd_foil, price_usd_etched, price_day)
          VALUES (${scryfall_id}, ${price_usd || null}, ${price_usd_foil || null}, ${price_usd_etched || null}, ${price_day})
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
  
  console.log(`[scryfall] Imported ${importedCount} price records to staging table`)
  
  // Update MtgCard prices
  const usdUpdates = await prisma.$executeRaw`
    UPDATE "MtgCard" mc
    SET "priceUsd" = ps.price_usd,
        "priceUpdatedAt" = now()
    FROM prices_staging ps
    WHERE mc."scryfallId"::text = ps.scryfall_id
      AND ps.price_usd IS NOT NULL
      AND (mc."priceUsd" IS DISTINCT FROM ps.price_usd)
  `
  
  const foilUpdates = await prisma.$executeRaw`
    UPDATE "MtgCard" mc
    SET "priceUsdFoil" = ps.price_usd_foil,
        "priceUpdatedAt" = now()
    FROM prices_staging ps
    WHERE mc."scryfallId"::text = ps.scryfall_id
      AND ps.price_usd_foil IS NOT NULL
      AND (mc."priceUsdFoil" IS DISTINCT FROM ps.price_usd_foil)
  `
  
  const etchedUpdates = await prisma.$executeRaw`
    UPDATE "MtgCard" mc
    SET "priceUsdEtched" = ps.price_usd_etched,
        "priceUpdatedAt" = now()
    FROM prices_staging ps
    WHERE mc."scryfallId"::text = ps.scryfall_id
      AND ps.price_usd_etched IS NOT NULL
      AND (mc."priceUsdEtched" IS DISTINCT FROM ps.price_usd_etched)
  `
  
  console.log(`[scryfall] Updated ${usdUpdates} USD prices, ${foilUpdates} foil prices, ${etchedUpdates} etched prices`)
  
  // Insert price history
  const normalHistory = await prisma.$executeRaw`
    INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day)
    SELECT ps.scryfall_id::uuid, 'normal', ps.price_usd, now(), ps.price_day
    FROM prices_staging ps
    WHERE ps.price_usd IS NOT NULL
    ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE
    SET price = EXCLUDED.price
  `
  
  const foilHistory = await prisma.$executeRaw`
    INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day)
    SELECT ps.scryfall_id::uuid, 'foil', ps.price_usd_foil, now(), ps.price_day
    FROM prices_staging ps
    WHERE ps.price_usd_foil IS NOT NULL
    ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE
    SET price = EXCLUDED.price
  `
  
  const etchedHistory = await prisma.$executeRaw`
    INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day)
    SELECT ps.scryfall_id::uuid, 'etched', ps.price_usd_etched, now(), ps.price_day
    FROM prices_staging ps
    WHERE ps.price_usd_etched IS NOT NULL
    ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE
    SET price = EXCLUDED.price
  `
  
  console.log(`[scryfall] Added ${normalHistory} normal, ${foilHistory} foil, ${etchedHistory} etched price history records`)
  
  // Cleanup staging table
  await prisma.$executeRaw`DROP TABLE IF EXISTS prices_staging`
  
  return Number(usdUpdates) + Number(foilUpdates) + Number(etchedUpdates)
}

export async function runDailyPriceUpdate(): Promise<DailyUpdateSummary> {
  const startTime = Date.now()
  
  try {
    console.log('[scryfall] Starting daily bulk price update...')
    
    // Use Vercel's temporary directory for serverless environments
    const dataDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
    console.log(`[scryfall] Using data directory: ${dataDir}`)
    console.log(`[scryfall] Vercel environment: ${process.env.VERCEL ? 'true' : 'false'}`)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    // 1. Fetch bulk data info
    const bulkInfo = await fetchBulkDataInfo()
    console.log(`[scryfall] Bulk data updated: ${bulkInfo.updated_at}`)
    console.log(`[scryfall] Size: ${Math.round(bulkInfo.size / 1024 / 1024)}MB`)
    
    // 2. Download bulk data
    const bulkDataPath = path.join(dataDir, 'daily-bulk-data.json')
    await downloadBulkData(bulkInfo.download_uri, bulkDataPath)
    
    // 3. Generate CSV from bulk data
    const csvPath = await generatePricesCsv(bulkDataPath)
    
    // 4. Import prices from CSV
    const updatedCount = await importPricesFromCsv(csvPath)
    
    // 5. Cleanup temporary files
    fs.unlinkSync(bulkDataPath)
    fs.unlinkSync(csvPath)
    
    const durationMs = Date.now() - startTime
    console.log(`[scryfall] Daily bulk update completed: ${updatedCount} cards updated in ${durationMs}ms`)
    
    return {
      updated: updatedCount,
      skipped: false,
      durationMs
    }
    
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    console.error('[scryfall] Daily bulk update failed:', error)
    
    return {
      updated: 0,
      skipped: true,
      durationMs
    }
  }
}