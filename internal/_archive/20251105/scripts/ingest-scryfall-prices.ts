#!/usr/bin/env node

import { prisma } from '@/lib/prisma'
import { Transform } from 'stream'
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'

interface IngestOptions {
  file?: string
  url?: string
  dryRun?: boolean
}

interface IngestResult {
  rowsCopied: number
  cardsUpdated: number
  historyNormal: number
  historyFoil: number
  historyEtched: number
  durationMs: number
}

class PriceIngestionPipeline {
  constructor() {
    // Use Prisma's connection
  }

  async connect(): Promise<void> {
    // Prisma handles connection automatically
  }

  async disconnect(): Promise<void> {
    await prisma.$disconnect()
  }

  private async downloadCsv(url: string, filePath: string): Promise<void> {
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
          console.log(`[ingest] Downloaded CSV to ${filePath}`)
          resolve()
        })
      }).on('error', (err) => {
        fs.unlink(filePath, () => reject(err))
      })
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
    console.log('[ingest] Copying CSV to staging table...')
    
    // Read CSV content and insert line by line (since COPY FROM STDIN requires raw pg client)
    const csvContent = fs.readFileSync(csvPath, 'utf8')
    const lines = csvContent.split('\n').slice(1) // Skip header
    
    let importedCount = 0
    for (const line of lines) {
      if (line.trim()) {
        const [scryfall_id, price_usd, price_usd_foil, price_usd_etched, price_day] = line.split(',')
        if (scryfall_id) {
          // Convert empty strings to null for proper database handling
          const normalizedUsd = price_usd && price_usd.trim() ? price_usd : null
          const normalizedFoil = price_usd_foil && price_usd_foil.trim() ? price_usd_foil : null
          const normalizedEtched = price_usd_etched && price_usd_etched.trim() ? price_usd_etched : null

          await prisma.$executeRaw`
            INSERT INTO scryfall_daily_prices_stage (scryfall_id, price_usd, price_usd_foil, price_usd_etched, price_day)
            VALUES (${scryfall_id}::uuid, ${normalizedUsd}::numeric, ${normalizedFoil}::numeric, ${normalizedEtched}::numeric, ${price_day}::date)
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

    console.log(`[ingest] ✅ Copied ${importedCount} rows to staging table`)
    return importedCount
  }

  private async runMergeTransaction(): Promise<{
    cardsUpdated: number
    historyNormal: number
    historyFoil: number
    historyEtched: number
  }> {
    console.log('[ingest] Running merge transaction...')
    
    try {
      // Truncate staging table
      await prisma.$executeRaw`TRUNCATE scryfall_daily_prices_stage`
      
      // Update MtgCard prices
      const updateResult = await prisma.$executeRaw`
        UPDATE "MtgCard" m
        SET
          "priceUsd" = s.price_usd,
          "priceUsdFoil" = s.price_usd_foil,
          "priceUsdEtched" = s.price_usd_etched,
          "priceUpdatedAt" = NOW()
        FROM scryfall_daily_prices_stage s
        WHERE m."scryfallId" = s.scryfall_id::text
      `
      
      const cardsUpdated = Number(updateResult)
      console.log(`[ingest] ✅ Updated ${cardsUpdated} cards`)
      
      // Insert price history for normal prices
      const normalResult = await prisma.$executeRaw`
        INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, source, price_day)
        SELECT scryfall_id, 'normal', price_usd, NOW(), 'scryfall', price_day
        FROM scryfall_daily_prices_stage WHERE price_usd IS NOT NULL
        ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE
        SET price = EXCLUDED.price, price_at = EXCLUDED.price_at, source = EXCLUDED.source
      `
      
      const historyNormal = Number(normalResult)
      console.log(`[ingest] ✅ Upserted ${historyNormal} normal price history records`)
      
      // Insert price history for foil prices
      const foilResult = await prisma.$executeRaw`
        INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, source, price_day)
        SELECT scryfall_id, 'foil', price_usd_foil, NOW(), 'scryfall', price_day
        FROM scryfall_daily_prices_stage WHERE price_usd_foil IS NOT NULL
        ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE
        SET price = EXCLUDED.price, price_at = EXCLUDED.price_at, source = EXCLUDED.source
      `
      
      const historyFoil = Number(foilResult)
      console.log(`[ingest] ✅ Upserted ${historyFoil} foil price history records`)
      
      // Insert price history for etched prices
      const etchedResult = await prisma.$executeRaw`
        INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, source, price_day)
        SELECT scryfall_id, 'etched', price_usd_etched, NOW(), 'scryfall', price_day
        FROM scryfall_daily_prices_stage WHERE price_usd_etched IS NOT NULL
        ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE
        SET price = EXCLUDED.price, price_at = EXCLUDED.price_at, source = EXCLUDED.source
      `
      
      const historyEtched = Number(etchedResult)
      console.log(`[ingest] ✅ Upserted ${historyEtched} etched price history records`)
      
      return {
        cardsUpdated,
        historyNormal,
        historyFoil,
        historyEtched
      }
      
    } catch (error) {
      throw error
    }
  }

  async ingest(options: IngestOptions): Promise<IngestResult> {
    const startTime = Date.now()
    
    try {
      await this.connect()
      
      let csvPath: string
      
      if (options.file) {
        csvPath = path.resolve(options.file)
        console.log(`[ingest] Using local CSV file: ${csvPath}`)
      } else if (options.url) {
        const tempDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true })
        }
        csvPath = path.join(tempDir, 'daily-prices.csv')
        await this.downloadCsv(options.url, csvPath)
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
          rowsCopied: lines,
          cardsUpdated: 0,
          historyNormal: 0,
          historyFoil: 0,
          historyEtched: 0,
          durationMs: Date.now() - startTime
        }
      }
      
      // Copy CSV to staging table
      const rowsCopied = await this.copyCsvToStage(csvPath)
      
      // Run merge transaction
      const mergeResult = await this.runMergeTransaction()
      
      const durationMs = Date.now() - startTime
      
      console.log(`[ingest] 🎉 Ingestion completed successfully!`)
      console.log(`[ingest] Rows copied: ${rowsCopied}`)
      console.log(`[ingest] Cards updated: ${mergeResult.cardsUpdated}`)
      console.log(`[ingest] Price history - Normal: ${mergeResult.historyNormal}, Foil: ${mergeResult.historyFoil}, Etched: ${mergeResult.historyEtched}`)
      console.log(`[ingest] Duration: ${durationMs}ms`)
      
      return {
        rowsCopied,
        cardsUpdated: mergeResult.cardsUpdated,
        historyNormal: mergeResult.historyNormal,
        historyFoil: mergeResult.historyFoil,
        historyEtched: mergeResult.historyEtched,
        durationMs
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
    const pipeline = new PriceIngestionPipeline()
    const result = await pipeline.ingest(options)
    
    if (options.dryRun) {
      console.log('🧪 Dry run completed successfully')
    } else {
      console.log('✅ Price ingestion completed successfully')
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
