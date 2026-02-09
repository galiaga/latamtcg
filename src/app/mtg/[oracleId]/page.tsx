import { notFound, redirect } from 'next/navigation'
import { getCardSlugFromOracleId } from '@/lib/cardSlug'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ oracleId: string }> }): Promise<Metadata> {
  // This route redirects, so it should not be indexed
  return {
    title: 'Redirecting...',
    robots: {
      index: false, // Do not index redirect pages
      follow: true,
    },
  }
}

export default async function OraclePage(props: { params: Promise<{ oracleId: string }> }) {
  const { oracleId } = await props.params

  // Look up the card slug for this oracleId
  const cardSlug = await getCardSlugFromOracleId(oracleId)
  
  if (!cardSlug) {
    // Card not found - return 404
    notFound()
  }

  // Permanent redirect to the canonical slug route
  // Note: redirect() uses 307 by default, which is acceptable for GET requests
  // For true 308 permanent redirect, this would need to be handled in middleware
  const redirectUrl = `/mtg/card/${encodeURIComponent(cardSlug)}`
  redirect(redirectUrl)
}


