// Intentionally not importing jest-dom to avoid SSR dynamic import issues under Vitest

// Minimal global fetch mock to satisfy SWR calls during tests
if (typeof (globalThis as any).fetch === 'undefined') {
  ;(globalThis as any).fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : String((input as any)?.url || '')
    if (url.includes('/api/cart')) {
      return new Response(JSON.stringify({ items: [], subtotal: 0, total: 0, count: 0 }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
  }
}

// Next.js mocks
import { vi } from 'vitest'
import React from 'react'
vi.mock('next/link', () => {
  const Link = (props: any) => React.createElement('a', props, props.children)
  return { __esModule: true, default: Link }
})
vi.mock('next/navigation', () => {
  return { usePathname: () => '/' }
})


