'use client'

import { createBrowserClient } from '@supabase/ssr'

let logged = false

export const supabaseBrowser = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!logged) {
    try { console.debug('[supabase-browser] url:', url, 'key.len:', key?.length) } catch {}
    logged = true
  }
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return createBrowserClient(url, key, {
    auth: { flowType: 'pkce', detectSessionInUrl: false, autoRefreshToken: true, persistSession: true },
  })
}


