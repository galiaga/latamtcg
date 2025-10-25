import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    // Check environment variables
    const envVars = {
      SCRYFALL_BULK_DATASET: process.env.SCRYFALL_BULK_DATASET,
      SCRYFALL_FILTER_PAPER_ONLY: process.env.SCRYFALL_FILTER_PAPER_ONLY,
      SCRYFALL_JSON_PARSE_MODE: process.env.SCRYFALL_JSON_PARSE_MODE,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
      CRON_SECRET: process.env.CRON_SECRET ? 'SET' : 'NOT_SET',
      SUPABASE_CA_PEM_BASE64: process.env.SUPABASE_CA_PEM_BASE64 ? 'SET' : 'NOT_SET',
      SUPABASE_CA_PEM: process.env.SUPABASE_CA_PEM ? 'SET' : 'NOT_SET'
    }

    // Test database connection with proper SSL config
    let dbStatus = 'NOT_TESTED'
    try {
      const { Client } = await import('pg')
      
      // Use the same SSL configuration as the cron scripts
      const caPem = process.env.SUPABASE_CA_PEM_BASE64
        ? Buffer.from(process.env.SUPABASE_CA_PEM_BASE64, 'base64').toString()
        : process.env.SUPABASE_CA_PEM

      let sslConfig
      if (process.env.NODE_ENV === 'production') {
        if (!caPem) {
          sslConfig = { rejectUnauthorized: false }
        } else {
          sslConfig = {
            rejectUnauthorized: true,
            ca: caPem
          }
        }
      } else {
        sslConfig = { rejectUnauthorized: false }
      }

      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: sslConfig
      })
      await client.connect()
      await client.query('SELECT 1')
      await client.end()
      dbStatus = 'CONNECTED'
    } catch (dbError) {
      dbStatus = `ERROR: ${dbError instanceof Error ? dbError.message : String(dbError)}`
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      envVars,
      dbStatus,
      message: 'Debug endpoint working'
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
