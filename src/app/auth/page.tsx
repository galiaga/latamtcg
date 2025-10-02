'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function AuthPage() {
  const router = useRouter()
  const supabase = useMemo(() => {
    try { return supabaseBrowser() } catch { return null }
  }, [])

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If already signed in, redirect to /orders
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!supabase) return
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      if (data.session) router.replace('/orders')
    })()
    return () => { mounted = false }
  }, [router, supabase])

  async function signInWithGoogle() {
    if (!supabase) { setError('Authentication is not configured.'); return }
    setSubmitting(true)
    try {
      console.debug('[auth] redirectTo', `${window.location.origin}/auth/callback`)
      const { error: err } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: 'select_account' } } as any })
      if (err) { console.error(err); setError(err.message || 'Failed to start Google sign-in.') }
    } finally {
      setSubmitting(false)
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) { setError('Authentication is not configured.'); return }
    const target = (e.currentTarget as HTMLFormElement)
    if (!email.trim()) { try { target.reportValidity?.() } catch {} return }
    setSubmitting(true)
    try {
      const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
      if (err) {
        console.error(err)
        setError(err.message || 'Failed to send magic link.')
      } else {
        setSent(true)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <div className="mt-4 space-y-3">
        <button type="button" className="btn btn-gradient w-full" onClick={signInWithGoogle} disabled={submitting || !supabase}>
          Continue with Google
        </button>
        <div className="text-center text-sm" style={{ color: 'var(--mutedText)' }}>or</div>
        <form onSubmit={sendMagicLink} className="space-y-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input w-full"
            placeholder="you@example.com"
            autoComplete="email"
          />
          <button type="submit" className="btn w-full" disabled={submitting || !email.trim() || !supabase}>
            {sent ? 'Magic link sent' : 'Email magic link'}
          </button>
        </form>
        {!supabase && (
          <div role="alert" className="text-sm p-2 rounded" style={{ background: 'var(--warnSoft)', color: 'var(--warnText)' }}>
            Authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </div>
        )}
        {error && (
          <div role="alert" aria-live="polite" className="text-sm p-2 rounded" style={{ background: 'var(--dangerSoft)', color: 'var(--dangerText)' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}


