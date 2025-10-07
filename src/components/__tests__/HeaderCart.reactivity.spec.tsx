import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import HeaderCart from '@/components/HeaderCart'
import { CartProvider } from '@/components/CartProvider'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Helper to render within provider and control data via dispatching events
function Wrapper({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}

function getBadge() {
  return screen.queryByTestId('cart-badge')
}

const server = setupServer()

describe('HeaderCart reactivity', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('updates instantly on cart:update with delta', async () => {
    render(
      <Wrapper>
        <HeaderCart />
      </Wrapper>
    )

    expect(getBadge()).toBeNull()
    // Ensure Provider effects are registered
    await act(async () => {
      await Promise.resolve()
    })
    // Reset any persisted SWR/cart state from other tests
    await act(async () => {
      localStorage.removeItem('cart:delta')
      window.dispatchEvent(new CustomEvent('cart:reset'))
      await new Promise((r) => setTimeout(r, 0))
    })
    await act(async () => {
      window.dispatchEvent(new CustomEvent('cart:update', { detail: { delta: 2 } }))
      await new Promise((r) => setTimeout(r, 0))
    })
    const badge = await screen.findByTestId('cart-badge')
    expect(badge != null).toBe(true)
    expect(badge?.textContent).toBe('2')
  })

  it('debounces storage pulses', async () => {
    server.use(
      http.get('/api/cart', async () => {
        return HttpResponse.json({ items: [], subtotal: 0, total: 0, count: 3 })
      })
    )
    render(
      <Wrapper>
        <HeaderCart />
      </Wrapper>
    )
    // Ensure Provider effects are registered
    await act(async () => {
      await Promise.resolve()
    })
    // Trigger cross-tab style pulse: should revalidate and fetch mocked count:3
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'cart:pulse', newValue: String(Date.now()) }))
      await new Promise((r) => setTimeout(r, 100))
    })
    const badge = await screen.findByTestId('cart-badge')
    expect(badge != null).toBe(true)
    expect(badge?.textContent).toBe('3')
  })
})


