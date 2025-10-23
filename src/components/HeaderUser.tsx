'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

type MinimalUser = { id: string; email: string | null }

export default function HeaderUser() {
  const router = useRouter()
  const pathname = usePathname()
  const menuRef = useRef<HTMLDivElement>(null)
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

  // Close menu on page navigation
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  if (loading) return null

  if (!user) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <Link href="/auth" className="btn">Sign in</Link>
      </div>
    )
  }

  return (
    <div className="ml-auto relative" ref={menuRef}>
      <button type="button" className="btn" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-haspopup="menu">
        {/* User icon for mobile */}
        <svg className="md:hidden h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        {/* Email for desktop */}
        <span className="hidden md:inline">{user.email || 'Account'}</span>
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
          <Link
            href="/how-it-works"
            className="block px-4 py-2 md:hidden"
            onClick={() => setMenuOpen(false)}
            style={{
              borderBottom: '1px solid var(--divider)'
            }}
          >
            How it works
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


