"use client"

import { useEffect, useState } from 'react'

function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  html.setAttribute('data-theme', theme)
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    // On mount, read persisted/system preference to avoid SSR/client mismatch
    try {
      const saved = window.localStorage.getItem('theme') as 'light' | 'dark' | null
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      const initial = saved === 'light' || saved === 'dark' ? saved : (prefersDark ? 'dark' : 'light')
      setTheme(initial)
    } catch {}
    setMounted(true)
  }, [])

  useEffect(() => {
    applyTheme(theme)
    try { window.localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  if (!mounted) return null

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      className="btn"
      aria-pressed={theme === 'light'}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <span aria-hidden>{theme === 'dark' ? '🌞' : '🌙'}</span>
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}


