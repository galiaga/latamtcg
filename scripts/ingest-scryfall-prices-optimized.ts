#!/usr/bin/env node

import { Client } from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import zlib from 'node:zlib'

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

interface IngestOptions {
  file?: string
  url?: string
  dryRun?: boolean
}

interface IngestResult {
  downloadMs?: number
  decompressMs?: number
  copyMs: number
  updateCardsMs: number
  upsertHistoryMs: number
  totalMs: number
  rowsInStage: number
  cardsUpdated: number
  historyUpserts: number
}

class OptimizedPriceIngestionPipeline {
  private client: Client

  constructor() {
    // Use DIRECT_URL for better SSL compatibility
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
    this.client = new Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    })
  }

  async connect(): Promise<void> {
    await this.client.connect()
  }

  async disconnect(): Promise<void> {
    await this.client.end()
  }

  private async downloadCsv(url: string, filePath: string): Promise<number> {
    const startTime = Date.now()
    
    return new Promise((resolve, reject) => {
      console.log(`[ingest] Downloading CSV from ${url}...`)
      const file = fs.createWriteStream(filePath)
      
      https.get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
          return
        }
        
        res.pipe(file)
        file.on('finish', () => {
          file.close()
          const durationMs = Date.now() - startTime
          console.log(`[ingest] ✅ Downloaded CSV in ${durationMs}ms`)
          resolve(durationMs)
        })
      }).on('error', (err) => {
        fs.unlink(filePath, () => reject(err))
      })
    })
  }

  private async decompressGz(gzPath: string, csvPath: string): Promise<number> {
    const startTime = Date.now()
    
    return new Promise((resolve, reject) => {
      console.log(`[ingest] Decompressing ${gzPath}...`)
      
      const readStream = fs.createReadStream(gzPath)
      const writeStream = fs.createWriteStream(csvPath)
      const gunzip = zlib.createGunzip()
      
      readStream
        .pipe(gunzip)
        .pipe(writeStream)
        .on('finish', () => {
          const durationMs = Date.now() - startTime
          console.log(`[ingest] ✅ Decompressed in ${durationMs}ms`)
          resolve(durationMs)
        })
        .on('error', reject)
    })
  }

  private validateCsvDate(csvPath: string): void {
    console.log('[ingest] Validating CSV date...')
    
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const csvContent = fs.readFileSync(csvPath, 'utf8')
    const firstLine = csvContent.split('\n')[1] // Skip header
    
    if (!firstLine) {
      throw new Error('CSV file appears to be empty')
    }
    
    const priceDay = firstLine.split(',')[4] // price_day column
    
    if (priceDay !== today) {
      throw new Error(`CSV price_day (${priceDay}) is not today (${today}). Aborting for safety.`)
    }
    
    console.log(`[ingest] ✅ CSV date validated: ${priceDay}`)
  }

  private async copyCsvToStage(csvPath: string): Promise<number> {
    const startTime = Date.now()
    console.log('[ingest] Copying CSV to staging table with batch inserts...')
    
    // Truncate staging table first
    await this.client.query('TRUNCATE scryfall_daily_prices_stage')
    
    // Read CSV and insert in batches (fallback approach)
    const csvContent = fs.readFileSync(csvPath, 'utf8')
    const lines = csvContent.split('\n').slice(1) // Skip header
    
    const batchSize = 5000
    let totalInserted = 0
    
    for (let i = 0; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, i + batchSize).filter(line => line.trim())
      
      if (batch.length === 0) continue
      
      // Build batch insert query
      const values = batch.map(line => {
        const [scryfall_id, price_usd, price_usd_foil, price_usd_etched, price_day] = line.split(',')
        
        // Convert empty strings to null
        const normalizedUsd = price_usd && price_usd.trim() ? price_usd : null
        const normalizedFoil = price_usd_foil && price_usd_foil.trim() ? price_usd_foil : null
        const normalizedEtched = price_usd_etched && price_usd_etched.trim() ? price_usd_etched : null
        
        return `('${scryfall_id}', ${normalizedUsd || 'NULL'}, ${normalizedFoil || 'NULL'}, ${normalizedEtched || 'NULL'}, '${price_day}')`
      }).join(',')
      
      await this.client.query(`
        INSERT INTO scryfall_daily_prices_stage (scryfall_id, price_usd, price_usd_foil, price_usd_etched, price_day)
        VALUES ${values}
      `)
      
      totalInserted += batch.length
      
      if (i % 20000 === 0) {
        console.log(`[ingest] Inserted ${totalInserted}/${lines.length} rows...`)
      }
    }
    
    const durationMs = Date.now() - startTime
    console.log(`[ingest] ✅ Copied ${totalInserted} rows to staging in ${durationMs}ms`)
    return durationMs
  }

  private async runSetBasedMerge(): Promise<{
    updateCardsMs: number
    upsertHistoryMs: number
    cardsUpdated: number
    historyUpserts: number
  }> {
    console.log('[ingest] Running set-based merge transaction...')
    
    await this.client.query('BEGIN')
    
    try {
      // Update MtgCard prices (set-based)
      const updateStartTime = Date.now()
      const updateResult = await this.client.query(`
        UPDATE "MtgCard" m
        SET
          "priceUsd"       = s.price_usd,
          "priceUsdFoil"   = s.price_usd_foil,
          "priceUsdEtched" = s.price_usd_etched,
          "priceUpdatedAt" = NOW()
        FROM scryfall_daily_prices_stage s
        WHERE m."scryfallId" = s.scryfall_id::text
      `)
      
      const updateCardsMs = Date.now() - updateStartTime
      const cardsUpdated = updateResult.rowCount || 0
      console.log(`[ingest] ✅ Updated ${cardsUpdated} cards in ${updateCardsMs}ms`)
      
      // Insert/Upsert price history in one pass (set-based)
      const historyStartTime = Date.now()
      const historyResult = await this.client.query(`
        WITH u AS (
          SELECT scryfall_id,'normal' AS finish, price_usd        AS price, price_day FROM scryfall_daily_prices_stage WHERE price_usd        IS NOT NULL
          UNION ALL
          SELECT scryfall_id,'foil'   AS finish, price_usd_foil   AS price, price_day FROM scryfall_daily_prices_stage WHERE price_usd_foil   IS NOT NULL
          UNION ALL
          SELECT scryfall_id,'etched' AS finish, price_usd_etched AS price, price_day FROM scryfall_daily_prices_stage WHERE price_usd_etched IS NOT NULL
        )
        INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, source, price_day)
        SELECT scryfall_id, finish, price, NOW(), 'scryfall', price_day
        FROM u
        ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE
        SET price = EXCLUDED.price, price_at = EXCLUDED.price_at, source = EXCLUDED.source
      `)
      
      const upsertHistoryMs = Date.now() - historyStartTime
      const historyUpserts = historyResult.rowCount || 0
      console.log(`[ingest] ✅ Upserted ${historyUpserts} price history records in ${upsertHistoryMs}ms`)
      
      await this.client.query('COMMIT')
      
      return {
        updateCardsMs,
        upsertHistoryMs,
        cardsUpdated,
        historyUpserts
      }
      
    } catch (error) {
      await this.client.query('ROLLBACK')
      throw error
    }
  }

  private async getStagingRowCount(): Promise<number> {
    const result = await this.client.query('SELECT COUNT(*) as count FROM scryfall_daily_prices_stage')
    return parseInt(result.rows[0].count)
  }

  async ingest(options: IngestOptions): Promise<IngestResult> {
    const totalStartTime = Date.now()
    
    try {
      await this.connect()
      
      let csvPath: string
      let downloadMs: number | undefined
      let decompressMs: number | undefined
      
      if (options.file) {
        csvPath = path.resolve(options.file)
        console.log(`[ingest] Using local CSV file: ${csvPath}`)
      } else if (options.url) {
        const tempDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true })
        }
        
        const fileName = options.url.endsWith('.gz') ? 'daily-prices.csv.gz' : 'daily-prices.csv'
        const tempPath = path.join(tempDir, fileName)
        
        downloadMs = await this.downloadCsv(options.url, tempPath)
        
        if (options.url.endsWith('.gz')) {
          csvPath = path.join(tempDir, 'daily-prices.csv')
          decompressMs = await this.decompressGz(tempPath, csvPath)
        } else {
          csvPath = tempPath
        }
      } else {
        throw new Error('Either --file or --url must be provided')
      }
      
      // Validate CSV date
      this.validateCsvDate(csvPath)
      
      if (options.dryRun) {
        console.log('[ingest] 🧪 DRY RUN MODE - No database changes will be made')
        const stats = fs.statSync(csvPath)
        const fileSizeMB = Math.round(stats.size / 1024 / 1024)
        console.log(`[ingest] CSV file size: ${fileSizeMB}MB`)
        
        // Count lines for dry run
        const csvContent = fs.readFileSync(csvPath, 'utf8')
        const lines = csvContent.split('\n').filter(line => line.trim()).length - 1 // Subtract header
        console.log(`[ingest] Would process ${lines} price records`)
        
        return {
          downloadMs,
          decompressMs,
          copyMs: 0,
          updateCardsMs: 0,
          upsertHistoryMs: 0,
          totalMs: Date.now() - totalStartTime,
          rowsInStage: lines,
          cardsUpdated: 0,
          historyUpserts: 0
        }
      }
      
      // Copy CSV to staging table
      const copyMs = await this.copyCsvToStage(csvPath)
      
      // Get staging row count
      const rowsInStage = await this.getStagingRowCount()
      
      // Run set-based merge
      const mergeResult = await this.runSetBasedMerge()
      
      const totalMs = Date.now() - totalStartTime
      
      console.log(`[ingest] 🎉 Optimized ingestion completed!`)
      console.log(`[ingest] Download: ${downloadMs || 0}ms`)
      console.log(`[ingest] Decompress: ${decompressMs || 0}ms`)
      console.log(`[ingest] Copy: ${copyMs}ms`)
      console.log(`[ingest] Update cards: ${mergeResult.updateCardsMs}ms`)
      console.log(`[ingest] Upsert history: ${mergeResult.upsertHistoryMs}ms`)
      console.log(`[ingest] Total: ${totalMs}ms`)
      console.log(`[ingest] Rows in stage: ${rowsInStage}`)
      console.log(`[ingest] Cards updated: ${mergeResult.cardsUpdated}`)
      console.log(`[ingest] History upserts: ${mergeResult.historyUpserts}`)
      
      return {
        downloadMs,
        decompressMs,
        copyMs,
        updateCardsMs: mergeResult.updateCardsMs,
        upsertHistoryMs: mergeResult.upsertHistoryMs,
        totalMs,
        rowsInStage,
        cardsUpdated: mergeResult.cardsUpdated,
        historyUpserts: mergeResult.historyUpserts
      }
      
    } finally {
      await this.disconnect()
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const options: IngestOptions = {}
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
        options.file = args[++i]
        break
      case '--url':
        options.url = args[++i]
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--help':
        console.log(`
Usage: yarn ingest:prices [options]

Options:
  --file <path>     Path to local CSV file
  --url <url>       URL to download CSV from
  --dry-run         Validate CSV without making database changes
  --help            Show this help message

Examples:
  yarn ingest:prices --file data/daily-prices.csv
  yarn ingest:prices --url https://api.scryfall.com/bulk-data/default-cards
  yarn ingest:prices --file data/daily-prices.csv --dry-run
        `)
        process.exit(0)
    }
  }
  
  if (!options.file && !options.url) {
    console.error('Error: Either --file or --url must be provided')
    console.error('Use --help for usage information')
    process.exit(1)
  }
  
  try {
    const pipeline = new OptimizedPriceIngestionPipeline()
    const result = await pipeline.ingest(options)
    
    if (options.dryRun) {
      console.log('🧪 Dry run completed successfully')
    } else {
      console.log('✅ Optimized price ingestion completed successfully')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Price ingestion failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
