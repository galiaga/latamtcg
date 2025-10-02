export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ authenticated: false }, { status: 200 })

  // Ensure minimal user row exists for linkage with carts/orders
  try {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user.email ? { email: user.email } : {},
      create: user.email ? { id: user.id, email: user.email } : { id: user.id },
    })
  } catch {}

  return NextResponse.json({ authenticated: true, user })
}


