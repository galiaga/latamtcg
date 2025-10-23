// Middleware to attach user context (request headers) for server actions/routes
// COMPLETE: reads Supabase session and propagates user id/email as headers
// STUB: Advanced RBAC/tenancy scoped out for v0
// ADDED: Bot blocking for GPTBot and AhrefsBot to reduce unwanted crawler traffic

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Block abusive bots that consume Vercel Image Transformations
const BLOCKED_BOTS = /GPTBot|AhrefsBot/i

export async function middleware(req: NextRequest) {
  // Bot blocking: hard block abusive bots in production unless ALLOW_BOTS=true
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_BOTS !== 'true') {
    const ua = req.headers.get('user-agent') || ''
    if (BLOCKED_BOTS.test(ua)) {
      return new Response('Forbidden', { status: 403 })
    }
  }

  const res = NextResponse.next()
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
    // Bot blocking: everything except static/internal assets
    '/((?!_next/|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|assets/|images/).*)',
    // User context: specific routes that need user headers
    '/orders/:path*',
    '/api/:path*',
  ],
}


