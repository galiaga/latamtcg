import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cardNameToSlug } from '@/lib/cardSlug'

const baseUrl = 'https://latamtcg.com'

// SEO-relevant static pages only
// Excluded: /cart, /orders, /auth, /mtg/search, /mtg/[oracleId] (these have noindex or redirect)
const staticPages: Array<{
  path: string
  priority: string
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly'
}> = [
  { path: '', priority: '1.0', changefreq: 'daily' }, // Homepage
  { path: '/mtg', priority: '0.9', changefreq: 'daily' }, // MTG landing page
]

export const dynamic = 'force-dynamic'

function escapeXml(url: string): string {
  return url
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatUrlEntry(url: string, lastmod: string, priority: string, changefreq: string): string {
  const escapedUrl = escapeXml(url)
  return `  <url>
    <loc>${escapedUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

export async function GET() {
  try {
    // Get current date in ISO 8601 format for lastmod
    const lastmod = new Date().toISOString().split('T')[0]

    // Build static page URLs
    const staticUrls = staticPages.map(({ path, priority, changefreq }) => {
      const url = `${baseUrl}${path === '' ? '/' : path}`
      return formatUrlEntry(url, lastmod, priority, changefreq)
    })

    // Fetch unique card names for dynamic card pages
    // Only include cards that are paper, English, and have at least one price
    // Group by card name (not oracleId) to get unique card slugs
    const uniqueCards = await prisma.mtgCard.findMany({
      where: {
        isPaper: true,
        lang: 'en',
        name: { not: '' }, // Exclude empty names
        OR: [
          { priceUsd: { not: null } },
          { priceUsdFoil: { not: null } },
          { priceUsdEtched: { not: null } },
        ],
      },
      select: {
        name: true,
      },
      distinct: ['name'],
      orderBy: {
        name: 'asc',
      },
    })

    // Build dynamic card page URLs using card slugs
    const cardUrls = uniqueCards.map(({ name }) => {
      const cardSlug = cardNameToSlug(name)
      const url = `${baseUrl}/mtg/card/${encodeURIComponent(cardSlug)}`
      // Card pages have lower priority than main pages
      return formatUrlEntry(url, lastmod, '0.7', 'weekly')
    })

    // Combine all URLs
    const allUrls = [...staticUrls, ...cardUrls]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.join('\n')}
</urlset>`

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400', // Cache for 1 hour, stale for 24 hours
      },
    })
  } catch (error) {
    console.error('[sitemap] Error generating sitemap:', error)
    // Return a minimal sitemap with just static pages on error
    const lastmod = new Date().toISOString().split('T')[0]
    const staticUrls = staticPages.map(({ path, priority, changefreq }) => {
      const url = `${baseUrl}${path === '' ? '/' : path}`
      return formatUrlEntry(url, lastmod, priority, changefreq)
    })

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.join('\n')}
</urlset>`

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
      status: 200, // Still return 200 to avoid breaking sitemap submission
    })
  }
}

