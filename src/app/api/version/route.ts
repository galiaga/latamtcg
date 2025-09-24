import { NextResponse } from 'next/server'
import pkg from '../../../../../package.json'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const p = path.join(process.cwd(), 'public', 'version.json')
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8')
      const json = JSON.parse(raw)
      return NextResponse.json(json)
    }
  } catch {}
  return NextResponse.json({ version: pkg.version || '0.0.0' })
}
