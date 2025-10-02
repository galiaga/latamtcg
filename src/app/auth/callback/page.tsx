'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function AuthCallback() {
  const router = useRouter()
  const sp = useSearchParams()

  useEffect(() => {
    const code = sp.get('code')
    const doExchange = async () => {
      try {
        if (!code) { router.replace('/orders'); return }
        const supabase = supabaseBrowser()
        const { data: pre } = await supabase.auth.getSession()
        if (!pre.session) {
          try {
            const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
            if (error) {
              // Suppress noisy PKCE console error; navigation proceeds either way
              // console.error('[auth/callback] exchange error', error)
            }
          } catch {}
        }
        try { await fetch('/api/cart/merge', { method: 'POST' }) } catch {}
      } finally {
        router.replace('/orders')
      }
    }
    void doExchange()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <p className="p-6">Signing you in…</p>
}


