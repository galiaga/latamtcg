import fs from 'fs'
import { Transform, Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { createGunzip } from 'zlib'
import StreamValues from 'stream-json/streamers/StreamValues'
import { parser as jsonParser } from 'stream-json'

export type PriceCsvRow = {
  scryfall_id: string
  price_usd: string | null
  price_usd_foil: string | null
  price_usd_etched: string | null
  price_day: string // YYYY-MM-DD
}

interface ScryfallCard {
  id: string
  games?: string[]
  prices?: {
    usd?: string | null
    usd_foil?: string | null
    usd_etched?: string | null
  }
}

/**
 * Resolve which parse mode to use based on environment and paperOnly setting
 * 
 * Rules:
 * - If paperOnly=true AND in PROD, force buffer mode for reliability
 * - Otherwise, use SCRYFALL_JSON_PARSE_MODE env var (default: 'stream')
 */
export function resolveParseMode({ paperOnly }: { paperOnly: boolean }): 'stream' | 'buffer' {
  const forceBufferInProd = paperOnly && process.env.VERCEL_ENV === 'production'
  
  if (forceBufferInProd) {
    return 'buffer'
  }
  
  return (process.env.SCRYFALL_JSON_PARSE_MODE || 'stream') as 'stream' | 'buffer'
}

/**
 * Convert Scryfall JSON bulk data to CSV format for price ingestion
 *
 * @param inputStream - Stream of Scryfall JSON data (JSON array format)
 * @param priceDay - Date in YYYY-MM-DD format (defaults to today in America/Santiago)
 * @returns Promise with CSV file path and row count
 */
export async function jsonToPriceCsv(
  inputStream: NodeJS.ReadableStream,
  priceDay: string
): Promise<{ csvPath: string; rowCount: number; rowsInJson: number; rowsWrittenCsv: number; rowsFilteredOut: number; parseMode: 'stream' | 'buffer'; fallbackUsed: boolean }> {
  const csvPath = '/tmp/daily-prices.csv'
  let rowCount = 0
  let rowsInJson = 0
  let rowsFilteredOut = 0
  let fallbackUsed = false

  // Check if paper-only filter is enabled
  const paperOnlyFilter = process.env.SCRYFALL_FILTER_PAPER_ONLY === 'true'
  
  // Resolve parse mode based on environment and paperOnly
  const parseMode = resolveParseMode({ paperOnly: paperOnlyFilter })
  
  console.log(`[json-to-csv] Paper-only filter: ${paperOnlyFilter}`)
  console.log(`[json-to-csv] Resolved parse mode: ${parseMode}`)

  // Determine if we should use buffer mode
  const shouldUseBufferMode = parseMode === 'buffer'

  // Buffer parsing function - use stream-json for memory efficiency
  const parseWithBuffer = async (data: Buffer): Promise<void> => {
    console.log(`[json-to-csv] Using buffer parse mode with stream-json...`)
    console.log('[mem]', Math.round(process.memoryUsage().rss/1024/1024), 'MB RSS')
    
    try {
      // Create CSV writer stream
      const csvWriter = fs.createWriteStream(csvPath)
      csvWriter.write('scryfall_id,price_usd,price_usd_foil,price_usd_etched,price_day\n')
      
      // Use stream-json for memory-efficient parsing
      const jsonStream = jsonParser()
      const valuesStream = StreamValues.withParser()
      
      return new Promise<void>((resolve, reject) => {
        jsonStream.on('data', (chunk: any) => {
          valuesStream.write(chunk)
        })
        
        jsonStream.on('end', () => {
          valuesStream.end()
        })
        
        valuesStream.on('data', (data: any) => {
          try {
            const card: ScryfallCard = data.value
            rowsInJson++
            
            // Apply paper-only filter if enabled
            if (paperOnlyFilter && card.games && !card.games.includes('paper')) {
              rowsFilteredOut++
              return // Skip this card
            }
            
            // Extract price data - include ALL prints regardless of price availability
            const scryfall_id = card.id
            const price_usd = card.prices?.usd || ''
            const price_usd_foil = card.prices?.usd_foil || ''
            const price_usd_etched = card.prices?.usd_etched || ''
            
            // Write CSV row (escape commas and quotes if needed)
            const csvRow = [
              scryfall_id,
              price_usd,
              price_usd_foil,
              price_usd_etched,
              priceDay
            ].map(field => {
              // Escape quotes and wrap in quotes if contains comma or quote
              const str = String(field || '')
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`
              }
              return str
            }).join(',')
            
            csvWriter.write(csvRow + '\n')
            rowCount++
            
            if (rowCount % 10000 === 0) {
              console.log(`[json-to-csv] Processed ${rowCount.toLocaleString()} cards... (RSS: ${Math.round(process.memoryUsage().rss/1024/1024)}MB)`)
            }
          } catch (err) {
            console.warn(`[json-to-csv] Skipping malformed card:`, err)
          }
        })
        
        valuesStream.on('end', () => {
          csvWriter.end()
          csvWriter.on('finish', () => {
            console.log(`[json-to-csv] Parsed ${rowsInJson.toLocaleString()} cards from buffer`)
            console.log(`[json-to-csv] Wrote ${rowCount.toLocaleString()} CSV rows`)
            resolve()
          })
          csvWriter.on('error', reject)
        })
        
        jsonStream.on('error', reject)
        valuesStream.on('error', reject)
        
        // Write the buffer to jsonStream
        jsonStream.write(data)
        jsonStream.end()
      })
      
    } catch (error) {
      throw new Error(`Buffer parsing failed: ${error}`)
    }
  }

  // Create CSV writer stream
  const csvWriter = fs.createWriteStream(csvPath)

  // Write CSV header
  csvWriter.write('scryfall_id,price_usd,price_usd_foil,price_usd_etched,price_day\n')

  // Buffer to accumulate JSON data
  let jsonBuffer = ''
  let arrayStarted = false
  let arrayEnded = false
  let lastProgressTime = Date.now()
  let watchdogTimer: NodeJS.Timeout | null = null

  // Create transform stream to convert JSON array to CSV rows
  const jsonToCsvTransform = new Transform({
    objectMode: false,
    transform(chunk: Buffer, encoding: string, callback: Function) {
      // Accumulate chunks
      jsonBuffer += chunk.toString()

      // Skip if array has ended
      if (arrayEnded) {
        callback()
        return
      }

      // Find the start of the array if not found yet
      if (!arrayStarted) {
        const arrayStart = jsonBuffer.indexOf('[')
        if (arrayStart === -1) {
          // Keep looking for the array start in future chunks
          callback()
          return
        }
        arrayStarted = true
        jsonBuffer = jsonBuffer.substring(arrayStart + 1) // Remove the opening bracket
        console.log(`[json-to-csv] Array started, remaining buffer length: ${jsonBuffer.length}`)
      }

      // Process complete JSON objects in the buffer
      let processedLength = 0
      
      while (true) {
        // Find the start of the next JSON object
        const objectStart = jsonBuffer.indexOf('{', processedLength)
        if (objectStart === -1) {
          break
        }

        // Find the matching closing brace
        let braceCount = 0
        let inString = false
        let escapeNext = false
        let objectEnd = -1

        for (let i = objectStart; i < jsonBuffer.length; i++) {
          const char = jsonBuffer[i]

          if (escapeNext) {
            escapeNext = false
            continue
          }

          if (char === '\\') {
            escapeNext = true
            continue
          }

          if (char === '"' && !escapeNext) {
            inString = !inString
            continue
          }

          if (!inString) {
            if (char === '{') {
              braceCount++
            } else if (char === '}') {
              braceCount--
              if (braceCount === 0) {
                objectEnd = i
                break
              }
            }
          }
        }

        if (objectEnd === -1) {
          // Incomplete object, wait for more data
          break
        }

        // Extract and parse the JSON object
        const jsonStr = jsonBuffer.substring(objectStart, objectEnd + 1)
                       try {
                         const card: ScryfallCard = JSON.parse(jsonStr)
                         rowsInJson++ // Count all JSON objects processed

                         // Apply paper-only filter if enabled
                         if (paperOnlyFilter && card.games && !card.games.includes('paper')) {
                           rowsFilteredOut++
                           continue // Skip this card
                         }

                         // Extract price data - include ALL prints regardless of price availability
                         const scryfall_id = card.id
                         const price_usd = card.prices?.usd || ''
                         const price_usd_foil = card.prices?.usd_foil || ''
                         const price_usd_etched = card.prices?.usd_etched || ''

                         // Write ALL prints to CSV, even if prices are empty

          // Write CSV row (escape commas and quotes if needed)
          const csvRow = [
            scryfall_id,
            price_usd,
            price_usd_foil,
            price_usd_etched,
            priceDay
          ].map(field => {
            // Escape quotes and wrap in quotes if contains comma or quote
            const str = String(field || '')
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`
            }
            return str
          }).join(',')

          csvWriter.write(csvRow + '\n')
          rowCount++
          processedLength = objectEnd + 1
          
          if (rowCount % 10000 === 0) {
            console.log(`[json-to-csv] Processed ${rowCount.toLocaleString()} cards...`)
            lastProgressTime = Date.now()
          }

        } catch (err) {
          // Skip malformed JSON objects
          console.warn(`[json-to-csv] Skipping malformed JSON object: ${jsonStr.substring(0, 100)}...`)
          processedLength = objectEnd + 1
        }

        // Check if we've reached the end of the array
        const nextChar = jsonBuffer.charAt(objectEnd + 1)
        if (nextChar === ']') {
          arrayEnded = true
          console.log(`[json-to-csv] Array ended, total cards processed: ${rowCount}`)
          break
        }
      }

      // Remove processed data from buffer
      if (processedLength > 0) {
        jsonBuffer = jsonBuffer.substring(processedLength)
      }

      callback()
    }
  })

  try {
    // Handle gzipped input
    let stream = inputStream
    
    // Check if it's a Node.js stream with readableObjectMode property
    if ('readable' in inputStream && 'readableObjectMode' in inputStream && 
        (inputStream as any).readable && (inputStream as any).readableObjectMode === false) {
      // Check if it's gzipped by looking at the first few bytes
      const firstChunk = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []
        ;(inputStream as any).on('data', (chunk: Buffer) => {
          chunks.push(chunk)
          if (chunks.length === 1) {
            resolve(Buffer.concat(chunks))
          }
        })
        ;(inputStream as any).on('error', reject)
        ;(inputStream as any).on('end', () => resolve(Buffer.concat(chunks)))
      })

      // Check for gzip magic number (0x1f 0x8b)
      if (firstChunk.length >= 2 && firstChunk[0] === 0x1f && firstChunk[1] === 0x8b) {
        stream = (inputStream as any).pipe(createGunzip())
      }
    }

    // If buffer mode is requested, stream through stream-json for memory efficiency
    if (shouldUseBufferMode) {
      console.log(`[json-to-csv] Buffer mode requested, using stream-json for memory-efficient parsing...`)
      
      // Use stream-json directly with the input stream (no buffering)
      const csvWriter = fs.createWriteStream(csvPath)
      csvWriter.write('scryfall_id,price_usd,price_usd_foil,price_usd_etched,price_day\n')
      
      const jsonStream = jsonParser()
      const valuesStream = StreamValues.withParser()
      
      await new Promise<void>((resolve, reject) => {
        // Pipe stream through stream-json using proper pipe chain
        stream.pipe(jsonStream)
        jsonStream.pipe(valuesStream)
        
        valuesStream.on('data', (data: any) => {
          try {
            const card: ScryfallCard = data.value
            rowsInJson++
            
            // Apply paper-only filter if enabled
            if (paperOnlyFilter && card.games && !card.games.includes('paper')) {
              rowsFilteredOut++
              return // Skip this card
            }
            
            // Extract price data - include ALL prints regardless of price availability
            const scryfall_id = card.id
            const price_usd = card.prices?.usd || ''
            const price_usd_foil = card.prices?.usd_foil || ''
            const price_usd_etched = card.prices?.usd_etched || ''
            
            // Write CSV row (escape commas and quotes if needed)
            const csvRow = [
              scryfall_id,
              price_usd,
              price_usd_foil,
              price_usd_etched,
              priceDay
            ].map(field => {
              // Escape quotes and wrap in quotes if contains comma or quote
              const str = String(field || '')
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`
              }
              return str
            }).join(',')
            
            csvWriter.write(csvRow + '\n')
            rowCount++
            
            if (rowCount % 10000 === 0) {
              console.log(`[json-to-csv] Processed ${rowCount.toLocaleString()} cards... (RSS: ${Math.round(process.memoryUsage().rss/1024/1024)}MB)`)
            }
          } catch (err) {
            console.warn(`[json-to-csv] Skipping malformed card:`, err)
          }
        })
        
        valuesStream.on('end', () => {
          csvWriter.end()
          csvWriter.on('finish', () => {
            console.log(`[json-to-csv] Parsed ${rowsInJson.toLocaleString()} cards`)
            console.log(`[json-to-csv] Wrote ${rowCount.toLocaleString()} CSV rows`)
            resolve()
          })
          csvWriter.on('error', reject)
        })
        
        valuesStream.on('error', reject)
        jsonStream.on('error', reject)
      })
    } else {
      // Stream mode with watchdog for hard timeout and progress monitoring
      const streamStartTime = Date.now()
      const abortController = new AbortController()
      
      const watchdogInterval = setInterval(() => {
        const elapsed = Date.now() - streamStartTime
        const timeSinceLastProgress = Date.now() - lastProgressTime
        
        // Hard cap of 20s for stream mode
        if (elapsed > 20000) {
          console.log(`[json-to-csv] Watchdog: 20s hard cap reached, aborting stream`)
          abortController.abort()
        }
        // No progress for 5s - likely stall
        else if (timeSinceLastProgress > 5000) {
          console.log(`[json-to-csv] Watchdog: no progress for ${Math.round(timeSinceLastProgress/1000)}s, aborting stream`)
          abortController.abort()
        }
      }, 1000) // Check every second
      
      try {
        // Process the stream with timeout
        await pipeline(
          stream,
          jsonToCsvTransform,
          csvWriter,
          { signal: abortController.signal }
        )
      } catch (error) {
        if (abortController.signal.aborted) {
          console.log(`[json-to-csv] Stream aborted by watchdog, fallback triggered`)
          fallbackUsed = true
          throw new Error('Stream aborted by watchdog')
        }
        throw error
      } finally {
        clearInterval(watchdogInterval)
      }
    }

    console.log(`[json-to-csv] ✅ Converted ${rowCount.toLocaleString()} cards to CSV`)
    console.log(`[json-to-csv] 📊 Metrics: ${rowsInJson.toLocaleString()} JSON objects processed, ${rowCount.toLocaleString()} CSV rows written`)
    if (paperOnlyFilter) {
      console.log(`[json-to-csv] 📊 Filtered out ${rowsFilteredOut.toLocaleString()} non-paper cards`)
    }

    return { csvPath, rowCount, rowsInJson, rowsWrittenCsv: rowCount, rowsFilteredOut, parseMode, fallbackUsed }

  } catch (error) {
    // Clear watchdog timer on error
    if (watchdogTimer) {
      clearInterval(watchdogTimer)
      watchdogTimer = null
    }

    // Handle fallback to buffer mode for stalled streams
    if (fallbackUsed && paperOnlyFilter && error instanceof Error && error.message.includes('Stream stalled')) {
      console.log(`[json-to-csv] Attempting fallback to buffer parse...`)
      
      try {
        // Reset counters
        rowCount = 0
        rowsInJson = 0
        rowsFilteredOut = 0
        
        // Clean up existing CSV file
        if (fs.existsSync(csvPath)) {
          fs.unlinkSync(csvPath)
        }
        
        // Collect all data from the original stream and parse with buffer
        const chunks: Buffer[] = []
        for await (const chunk of inputStream) {
          chunks.push(Buffer.from(chunk))
        }
        const fullData = Buffer.concat(chunks)
        
        await parseWithBuffer(fullData)
        
        console.log(`[json-to-csv] ✅ Fallback buffer parse completed`)
        console.log(`[json-to-csv] 📊 Metrics: ${rowsInJson.toLocaleString()} JSON objects processed, ${rowCount.toLocaleString()} CSV rows written`)
        if (paperOnlyFilter) {
          console.log(`[json-to-csv] 📊 Filtered out ${rowsFilteredOut.toLocaleString()} non-paper cards`)
        }
        
        return { csvPath, rowCount, rowsInJson, rowsWrittenCsv: rowCount, rowsFilteredOut, parseMode, fallbackUsed }
        
      } catch (fallbackError) {
        console.error(`[json-to-csv] Fallback buffer parse also failed:`, fallbackError)
        // Continue to original error handling
      }
    }

    // Clean up on error
    try {
      csvWriter.close()
      if (fs.existsSync(csvPath)) {
        fs.unlinkSync(csvPath)
      }
    } catch (cleanupError) {
      console.warn('[json-to-csv] Error during cleanup:', cleanupError)
    }

    throw new Error(`JSON to CSV conversion failed: ${error}`)
  }
}

/**
 * Download Scryfall bulk data and convert to CSV
 *
 * @param bulkUrl - URL to Scryfall bulk data
 * @param priceDay - Date in YYYY-MM-DD format
 * @returns Promise with CSV file path and row count
 */
export async function downloadAndConvertToCsv(
  bulkUrl: string,
  priceDay: string
): Promise<{ csvPath: string; rowCount: number; rowsInJson: number; rowsWrittenCsv: number; rowsFilteredOut: number; downloadMs: number; convertMs: number; parseMode: 'stream' | 'buffer'; fallbackUsed: boolean }> {
  const downloadStartTime = Date.now()
  console.log(`[json-to-csv] Downloading Scryfall bulk data from: ${bulkUrl}`)

  const response = await fetch(bulkUrl, {
    headers: {
      'User-Agent': 'latamtcg-price-ingestion/1.0',
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to download bulk data: ${response.status} ${response.statusText}`)
  }

  const downloadMs = Date.now() - downloadStartTime
  console.log(`[json-to-csv] ✅ Downloaded bulk data in ${downloadMs}ms`)

  // Convert Web Streams API ReadableStream to Node.js stream
  let nodeStream = Readable.fromWeb(response.body as any)
  
  // Check if response is gzipped and decompress if needed
  const contentEncoding = response.headers.get('content-encoding')
  if (contentEncoding && contentEncoding.includes('gzip')) {
    console.log(`[json-to-csv] Response is gzipped, decompressing...`)
    nodeStream = nodeStream.pipe(createGunzip())
  }

  const convertStartTime = Date.now()
  const { csvPath, rowCount, rowsInJson, rowsWrittenCsv, rowsFilteredOut, parseMode, fallbackUsed } = await jsonToPriceCsv(nodeStream, priceDay)
  const convertMs = Date.now() - convertStartTime

  return { csvPath, rowCount, rowsInJson, rowsWrittenCsv, rowsFilteredOut, downloadMs, convertMs, parseMode, fallbackUsed }
}