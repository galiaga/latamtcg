export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/debug/flow-config
 * Diagnostic endpoint to check Flow configuration
 * In production, requires ?secret=CRON_SECRET or ?secret=FLOW_SECRET query parameter
 */
export async function GET(req: NextRequest) {
  // In production, require secret token (use CRON_SECRET if available, otherwise FLOW_SECRET)
  if (process.env.NODE_ENV === 'production') {
    const secret = req.nextUrl.searchParams.get('secret')?.trim()
    const expectedSecret = (process.env.CRON_SECRET || process.env.FLOW_SECRET)?.trim()
    
    // Debug info (without exposing actual secrets)
    const debugInfo = {
      hasSecret: !!secret,
      secretLength: secret?.length || 0,
      hasExpectedSecret: !!expectedSecret,
      expectedSecretLength: expectedSecret?.length || 0,
      secretsMatch: secret === expectedSecret,
    }
    
    if (!expectedSecret) {
      return NextResponse.json({ 
        error: 'unauthorized', 
        message: 'No secret configured in environment. FLOW_SECRET or CRON_SECRET must be set.',
        debug: debugInfo
      }, { status: 401 })
    }
    
    if (!secret || secret !== expectedSecret) {
      return NextResponse.json({ 
        error: 'unauthorized', 
        message: 'Secret mismatch. Check that the secret parameter matches your FLOW_SECRET exactly.',
        debug: debugInfo
      }, { status: 401 })
    }
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

