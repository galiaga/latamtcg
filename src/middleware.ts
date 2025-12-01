// Middleware to attach user context (request headers) for server actions/routes
// COMPLETE: reads Supabase session and propagates user id/email as headers
// STUB: Advanced RBAC/tenancy scoped out for v0
// ADDED: Bot blocking for GPTBot and AhrefsBot to reduce unwanted crawler traffic
// ADDED: Cron API route bypass for authentication protection
// ADDED: next-intl locale handling (defaults to 'es' for MVP)

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Block abusive bots that consume Vercel Image Transformations
const BLOCKED_BOTS = /GPTBot|AhrefsBot/i

console.log('[auth] middleware initialized - cron routes bypass enabled')

// Create next-intl middleware (defaults to 'es' locale)
const intlMiddleware = createMiddleware(routing)

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  
  // Canonical domain redirects: redirect www and http to https://latamtcg.com
  const host = req.headers.get('host') || ''
  const protocol = req.headers.get('x-forwarded-proto') || 'https'
  const url = req.nextUrl.clone()
  
  // Redirect www subdomain to non-www
  if (host.startsWith('www.')) {
    url.host = 'latamtcg.com'
    url.protocol = 'https:'
    return NextResponse.redirect(url, 301)
  }
  
  // Redirect HTTP to HTTPS (Vercel usually handles this, but this is a safety measure)
  if (protocol === 'http' && host === 'latamtcg.com') {
    url.protocol = 'https:'
    return NextResponse.redirect(url, 301)
  }
  
  // Allow cron API routes to bypass all authentication/protection
  if (pathname.startsWith('/api/cron/')) {
    console.log(`[auth] Bypassing authentication for cron route: ${pathname}`)
    return NextResponse.next()
  }

  // Skip i18n middleware for API routes (they don't need locale handling)
  const isApiRoute = pathname.startsWith('/api/')
  
  // Bot blocking: hard block abusive bots in production unless ALLOW_BOTS=true
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_BOTS !== 'true') {
    const ua = req.headers.get('user-agent') || ''
    if (BLOCKED_BOTS.test(ua)) {
      return new Response('Forbidden', { status: 403 })
    }
  }

  // For MVP with localePrefix: 'never' and single locale, we can skip intl middleware
  // Locale detection happens server-side via getRequestConfig
  // This avoids any routing issues while still supporting translations
  let res: NextResponse = NextResponse.next()
  
  // Only run intl middleware if we're not using 'never' prefix mode
  // For now, skip it entirely since we have localePrefix: 'never'
  // When adding multiple locales later, you can re-enable this
  // if (routing.localePrefix !== 'never') {
  //   try {
  //     const intlResponse = intlMiddleware(req)
  //     res = intlResponse instanceof NextResponse ? intlResponse : NextResponse.next()
  //   } catch (error) {
  //     console.warn('[middleware] intl middleware error:', error)
  //   }
  // }
  
  // Add user context headers
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return req.cookies.get(name)?.value },
          set() {},
          remove() {},
        },
      }
    )
    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (user) {
      res.headers.set('x-user-id', user.id)
      if (user.email) res.headers.set('x-user-email', user.email)
    }
  } catch {}
  return res
}

export const config = {
  matcher: [
    // Exclude static files, API routes, and Next.js internal files
    // This ensures middleware only runs on actual page routes
    '/((?!api|_next|_vercel|.*\\..*|favicon.ico|robots.txt|sitemap.xml|manifest.*|assets|images).*)',
  ],
}


