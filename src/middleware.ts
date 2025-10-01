// Middleware to attach user context (request headers) for server actions/routes
// COMPLETE: reads Supabase session and propagates user id/email as headers
// STUB: Advanced RBAC/tenancy scoped out for v0

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
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
    '/orders/:path*',
    '/api/:path*',
  ],
}


