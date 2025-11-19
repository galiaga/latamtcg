import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { locale } = body

    // Validate locale
    if (!locale || !['es', 'en'].includes(locale)) {
      return NextResponse.json(
        { error: 'Invalid locale' },
        { status: 400 }
      )
    }

    // Set the locale cookie (expires in 1 year)
    const cookieStore = await cookies()
    cookieStore.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return NextResponse.json({ success: true, locale })
  } catch (error) {
    console.error('[locale] Error setting locale:', error)
    return NextResponse.json(
      { error: 'Failed to set locale' },
      { status: 500 }
    )
  }
}

