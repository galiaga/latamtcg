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
        const { error } = await supabase.auth.exchangeCodeForSession({ code })
        if (error) console.error('[auth/callback] exchange error', error)
      } finally {
        try {
          console.error('[auth/callback] envs', {
            url: process.env.NEXT_PUBLIC_SUPABASE_URL,
            keyLen: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
          })
        } catch {}
        router.replace('/orders')
      }
    }
    void doExchange()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <p className="p-6">Signing you in…</p>
}


