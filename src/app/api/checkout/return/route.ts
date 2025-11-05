import { NextRequest, NextResponse } from 'next/server'
import { parseFlowCallback } from '@/lib/flow/flowClient'

/**
 * Handle POST requests from Flow redirect
 * Flow redirects via POST with form data, so we parse it and redirect to the page with GET
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[checkout/return] Received POST from Flow')
    
    // Parse Flow callback data (handles both form-urlencoded and JSON)
    const params = await parseFlowCallback(req)
    
    console.log('[checkout/return] Parsed params:', Object.keys(params))
    
    // Extract token (Flow may use different parameter names)
    const token = params.token || params.Token || params.token_payment || params.TOKEN
    const status = params.status || params.Status || params.STATUS
    
    console.log('[checkout/return] Extracted token:', token ? `${token.substring(0, 10)}...` : 'missing')
    
    if (!token) {
      console.error('[checkout/return] No token found in Flow redirect. Params:', Object.keys(params))
    }
    
    // Build query string
    const queryParams = new URLSearchParams()
    if (token) queryParams.set('token', String(token))
    if (status) queryParams.set('status', String(status))
    
    // Redirect to return page with GET (so the page component can handle it)
    const baseUrl = process.env.APP_BASE_URL || req.nextUrl.origin
    const returnUrl = new URL('/checkout/return', baseUrl)
    returnUrl.search = queryParams.toString()
    
    console.log('[checkout/return] Redirecting to:', returnUrl.toString())
    
    return NextResponse.redirect(returnUrl)
  } catch (error) {
    console.error('[checkout/return] POST handler error:', error)
    // Fallback: redirect to return page without params
    const baseUrl = process.env.APP_BASE_URL || req.nextUrl.origin
    return NextResponse.redirect(new URL('/checkout/return', baseUrl))
  }
}

