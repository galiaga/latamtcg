import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  try {
    const store = await cookies()
    const token = store.get('cart_token')?.value || null
    if (token) {
      try { await prisma.cart.deleteMany({ where: { token } }) } catch {}
    }
    try { res.cookies.set({ name: 'cart_token', value: '', path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 0 }) } catch {}
  } catch {}
  return res
}


