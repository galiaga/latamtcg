export const runtime = 'nodejs'
import { NextResponse } from 'next/server'

/**
 * GET /api/debug/flow-config
 * Diagnostic endpoint to check Flow configuration
 * Only available in non-production
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_available_in_production' }, { status: 403 })
  }

  const config = {
    FLOW_API_KEY: process.env.FLOW_API_KEY ? '✅ Set' : '❌ Missing',
    FLOW_SECRET: process.env.FLOW_SECRET ? '✅ Set' : '❌ Missing',
    FLOW_BASE_URL: process.env.FLOW_BASE_URL || 'https://www.flow.cl/api (default)',
    FLOW_RETURN_URL: process.env.FLOW_RETURN_URL || '❌ Missing',
    FLOW_CALLBACK_URL: process.env.FLOW_CALLBACK_URL || '❌ Missing',
    APP_BASE_URL: process.env.APP_BASE_URL || '❌ Missing',
  }

  // Validate URLs
  const urlErrors: string[] = []
  if (process.env.FLOW_RETURN_URL) {
    try {
      new URL(process.env.FLOW_RETURN_URL)
    } catch {
      urlErrors.push('FLOW_RETURN_URL is not a valid URL')
    }
  }
  if (process.env.FLOW_CALLBACK_URL) {
    try {
      new URL(process.env.FLOW_CALLBACK_URL)
    } catch {
      urlErrors.push('FLOW_CALLBACK_URL is not a valid URL')
    }
  }

  return NextResponse.json({
    config,
    urlErrors,
    allSet: Object.values(config).every(v => !v.includes('❌')) && urlErrors.length === 0,
  })
}

