export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/debug/flow-config
 * Diagnostic endpoint to check Flow configuration
 * In production, requires ?secret=FLOW_SECRET query parameter
 */
export async function GET(req: NextRequest) {
  // In production, require secret token (use FLOW_SECRET for Flow config debugging)
  if (process.env.NODE_ENV === 'production') {
    const secret = req.nextUrl.searchParams.get('secret')?.trim()
    // Use FLOW_SECRET directly since this endpoint is for Flow configuration
    const rawExpectedSecret = process.env.FLOW_SECRET
    const expectedSecret = rawExpectedSecret?.trim()
    
    // Check for hidden characters (non-printable, newlines, etc.)
    const hasHiddenChars = rawExpectedSecret && rawExpectedSecret !== rawExpectedSecret.trim()
    const nonPrintableChars = rawExpectedSecret ? Array.from(rawExpectedSecret).filter(c => {
      const code = c.charCodeAt(0)
      return code < 32 && code !== 9 && code !== 10 && code !== 13 // Exclude tab, LF, CR
    }) : []
    
    // Debug info (without exposing actual secrets)
    const debugInfo = {
      hasSecret: !!secret,
      secretLength: secret?.length || 0,
      secretFirstChars: secret?.substring(0, 8) || '',
      secretLastChars: secret?.substring(Math.max(0, (secret?.length || 0) - 8)) || '',
      hasExpectedSecret: !!expectedSecret,
      rawExpectedSecretLength: rawExpectedSecret?.length || 0,
      expectedSecretLength: expectedSecret?.length || 0,
      expectedSecretFirstChars: expectedSecret?.substring(0, 8) || '',
      expectedSecretLastChars: expectedSecret?.substring(Math.max(0, (expectedSecret?.length || 0) - 8)) || '',
      secretsMatch: secret === expectedSecret,
      // Check for hidden characters
      hasHiddenChars: hasHiddenChars,
      nonPrintableCharCount: nonPrintableChars.length,
      lengthMismatch: (secret?.length || 0) !== (expectedSecret?.length || 0),
      // Show FLOW_SECRET info
      flowSecretLength: process.env.FLOW_SECRET?.length || 0,
    }
    
    if (!expectedSecret) {
      return NextResponse.json({ 
        error: 'unauthorized', 
        message: 'No FLOW_SECRET configured in environment.',
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
    FLOW_API_KEY: process.env.FLOW_API_KEY ? `✅ Set (${process.env.FLOW_API_KEY.length} chars)` : '❌ Missing',
    FLOW_SECRET: process.env.FLOW_SECRET ? `✅ Set (${process.env.FLOW_SECRET.length} chars)` : '❌ Missing',
    FLOW_BASE_URL: process.env.FLOW_BASE_URL || 'https://www.flow.cl/api (default)',
    FLOW_RETURN_URL: process.env.FLOW_RETURN_URL || '❌ Missing',
    FLOW_CALLBACK_URL: process.env.FLOW_CALLBACK_URL || '❌ Missing',
    APP_BASE_URL: process.env.APP_BASE_URL || '❌ Missing',
    // Also check CRON_SECRET to see if it exists
    CRON_SECRET: process.env.CRON_SECRET ? `✅ Set (${process.env.CRON_SECRET.length} chars)` : '❌ Missing',
    NODE_ENV: process.env.NODE_ENV || 'not set',
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

