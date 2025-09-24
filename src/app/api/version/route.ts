import { NextResponse } from 'next/server'
import pkg from '../../../../../package.json'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const resp = await fetch(new URL('/version.json', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
    if (resp.ok) {
      const json = await resp.json()
      return NextResponse.json(json)
    }
  } catch {}
  return NextResponse.json({ version: pkg.version || '0.0.0' })
}
