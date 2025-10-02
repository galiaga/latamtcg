export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { mergeAnonymousCartIntoUser } from '@/lib/cart'
import { getSessionUser } from '@/lib/supabase'

export async function POST() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ merged: false, reason: 'not_authenticated' }, { status: 401 })
  const result = await mergeAnonymousCartIntoUser(user.id)
  return NextResponse.json(result)
}


