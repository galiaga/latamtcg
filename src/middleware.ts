// Middleware: canonical redirects, bot blocking, /en cookie, cron bypass.
// Auth is NOT run here (avoids Edge timeout). Use getSessionUser() in Server Components / API routes.

import { NextResponse, type NextRequest } from 'next/server'

const BLOCKED_BOTS = /GPTBot|AhrefsBot/i

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Canonical domain: www and http → https://latamtcg.com
  const host = req.headers.get('host') || ''
  const protocol = req.headers.get('x-forwarded-proto') || 'https'
  const url = req.nextUrl.clone()

  if (host.startsWith('www.')) {
    url.host = 'latamtcg.com'
    url.protocol = 'https:'
    return NextResponse.redirect(url, 301)
  }

  if (protocol === 'http' && host === 'latamtcg.com') {
    url.protocol = 'https:'
    return NextResponse.redirect(url, 301)
  }

  // /en: set English locale cookie
  if (pathname.startsWith('/en')) {
    const response = NextResponse.next()
    response.cookies.set('NEXT_LOCALE', 'en', {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    })
    return response
  }

  // Cron API routes bypass (matcher excludes /api/*; kept if matcher changes later)
  if (pathname.startsWith('/api/cron/')) {
    return NextResponse.next()
  }

  // Bot blocking in production
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_BOTS !== 'true') {
    const ua = req.headers.get('user-agent') || ''
    if (BLOCKED_BOTS.test(ua)) {
      return new Response('Forbidden', { status: 403 })
    }
  }

  // No Supabase/auth in middleware (causes MIDDLEWARE_INVOCATION_TIMEOUT on Vercel Edge).
  // Use getSessionUser() in Server Components and API routes instead.
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*|favicon.ico|robots.txt|sitemap.xml|manifest.*|assets|images).*)',
  ],
}
