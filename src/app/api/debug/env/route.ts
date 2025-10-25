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
      CRON_SECRET: process.env.CRON_SECRET ? 'SET' : 'NOT_SET'
    }

    // Test database connection
    let dbStatus = 'NOT_TESTED'
    try {
      const { Client } = await import('pg')
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
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
