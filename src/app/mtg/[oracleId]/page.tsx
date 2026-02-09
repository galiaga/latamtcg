import { notFound } from 'next/navigation'
import { NextResponse } from 'next/server'
import { getCardSlugFromOracleId } from '@/lib/cardSlug'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ oracleId: string }> }): Promise<Metadata> {
  const { oracleId } = await props.params
  
  // This route redirects, so it should not be indexed
  return {
    title: 'Redirecting...',
    robots: {
      index: false, // Do not index redirect pages
      follow: true,
    },
  }
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-2 py-0.5 text-xs rounded bg-zinc-200 mr-1 mb-1">
      {children}
    </span>
  )
}

export default async function OraclePage(props: { params: Promise<{ oracleId: string }> }) {
  const { oracleId } = await props.params

  // Look up the card slug for this oracleId
  const cardSlug = await getCardSlugFromOracleId(oracleId)
  
  if (!cardSlug) {
    // Card not found - return 404
    notFound()
  }

  // Permanent redirect (308) to the canonical slug route
  // Using 308 instead of 301 to preserve POST/PUT methods if needed (though GET is expected)
  // 308 is preferred for permanent redirects that preserve method
  const redirectUrl = `/mtg/card/${encodeURIComponent(cardSlug)}`
  return NextResponse.redirect(new URL(redirectUrl, 'https://latamtcg.com'), { status: 308 })
}


