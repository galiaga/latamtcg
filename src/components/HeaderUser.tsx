'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

type MinimalUser = { id: string; email: string | null }

export default function HeaderUser() {
  const router = useRouter()
  const supabase = useMemo(() => {
    try { return supabaseBrowser() } catch { return null }
  }, [])
  const [user, setUser] = useState<MinimalUser | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsub: (() => void) | undefined
    let mounted = true
    ;(async () => {
      if (!supabase) { setLoading(false); return }
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      const u = data.session?.user
      setUser(u ? { id: u.id, email: u.email ?? null } : null)
      setLoading(false)

      const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
          setUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null)
          try {
            if (session) {
              await fetch('/api/auth/callback', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ event: 'SIGNED_IN', session }),
              })
            }
          } catch {}
          try { await fetch('/api/cart/merge', { method: 'POST' }) } catch {}
          try { window.dispatchEvent(new CustomEvent('cart:refresh')) } catch {}
          router.refresh()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          try {
            await fetch('/api/auth/callback', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ event: 'SIGNED_OUT' }),
            })
          } catch {}
          try { await fetch('/api/cart/reset', { method: 'POST' }) } catch {}
          try { window.dispatchEvent(new CustomEvent('cart:refresh')) } catch {}
          router.refresh()
        } else if (event === 'USER_UPDATED') {
          setUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null)
          router.refresh()
        }
      })
      unsub = () => sub.subscription.unsubscribe()
    })()
    return () => { mounted = false; try { unsub?.() } catch {} }
  }, [router, supabase])

  if (loading) return null

  if (!user) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <Link href="/auth" className="btn">Sign in</Link>
      </div>
    )
  }

  return (
    <div className="ml-auto relative">
      <button type="button" className="btn" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-haspopup="menu">
        {user.email || 'Account'}
      </button>
      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-xl border z-50 pointer-events-auto"
          style={{
            background: 'var(--card)',
            color: 'var(--text)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow)'
          }}
        >
          <Link
            href="/orders"
            className="block px-4 py-2"
            onClick={() => setMenuOpen(false)}
            style={{
              borderBottom: '1px solid var(--divider)'
            }}
          >
            Orders
          </Link>
          <button
            type="button"
            className="block w-full text-left px-4 py-2"
            onClick={async () => {
              try { await supabase?.auth.signOut() } catch {}
              setMenuOpen(false)
              router.refresh()
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in oklab, var(--chip-hover) 40%, transparent)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}


