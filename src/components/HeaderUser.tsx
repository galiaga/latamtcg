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
        <div role="menu" className="absolute right-0 mt-2 w-40 border rounded bg-white dark:bg-black z-50">
          <Link href="/orders" className="block px-3 py-2 hover:bg-gray-50 dark:hover:bg-zinc-900" onClick={() => setMenuOpen(false)}>Orders</Link>
          <button
            type="button"
            className="block w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-zinc-900"
            onClick={async () => {
              try { await supabase?.auth.signOut() } catch {}
              setMenuOpen(false)
              router.refresh()
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}


