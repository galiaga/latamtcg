"use client"

import { useEffect, useState } from 'react'

function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  html.setAttribute('data-theme', theme)
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark'
    const saved = window.localStorage.getItem('theme') as 'light' | 'dark' | null
    if (saved === 'light' || saved === 'dark') return saved
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  })

  useEffect(() => {
    applyTheme(theme)
    try { window.localStorage.setItem('theme', theme) } catch {}
  }, [theme])

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


