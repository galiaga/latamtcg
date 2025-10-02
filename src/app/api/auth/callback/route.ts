import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'
import { mergeAnonymousCartIntoUser } from '@/lib/cart'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { event?: string, session?: any }
  const event = body.event || ''
  const session = body.session

  const res = NextResponse.json({ ok: true })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return res

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) { return req.cookies.get(name)?.value },
      set(name: string, value: string, options: CookieOptions) { try { res.cookies.set({ name, value, ...options }) } catch {} },
      remove(name: string, options: CookieOptions) { try { res.cookies.set({ name, value: '', ...options }) } catch {} },
    },
  })

  try {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (session?.access_token && session?.refresh_token) {
        await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token })
      }
    }
    if (event === 'SIGNED_OUT') {
      await supabase.auth.signOut()
      try {
        const token = req.cookies.get('cart_token')?.value || null
        if (token) {
          try { await prisma.cart.deleteMany({ where: { token } }) } catch {}
        }
        try { res.cookies.set({ name: 'cart_token', value: '', path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 0 }) } catch {}
      } catch {}
    }
    // After sign-in, merge any anonymous cart into the user's cart
    if (event === 'SIGNED_IN') {
      const userId = (session as any)?.user?.id as string | undefined
      if (userId) {
        try { await mergeAnonymousCartIntoUser(userId) } catch {}
      }
    }
  } catch {}

  return res
}


