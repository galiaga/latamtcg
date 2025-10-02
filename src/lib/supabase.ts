// Supabase Auth setup (server helpers)
// COMPLETE: minimal server client factory using cookies
// STUB: OAuth/email link configuration is handled in Supabase project dashboard

import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const cookieStore = await cookies() as any
    const supabase = createServerClient(
      url,
      key,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try { cookieStore.set({ name, value, ...options }) } catch {}
          },
          remove(name: string, options: CookieOptions) {
            try { cookieStore.set({ name, value: '', ...options }) } catch {}
          },
        },
      } as any
    )
    return supabase
  } catch {
    return null
  }
}

export type SessionUser = {
  id: string
  email: string | null
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await getSupabaseServer()
  if (!supabase) return null
  try {
    const { data } = await supabase.auth.getUser()
    const user = (data as any)?.user
    if (!user) return null
    return { id: user.id, email: user.email ?? null }
  } catch {
    return null
  }
}


