import { NextResponse } from 'next/server'

const baseUrl = 'https://latamtcg.com'

// Main public pages
const staticPages = [
  '',
  '/mtg/search',
  '/how-it-works',
  '/help',
  '/contact',
  '/returns',
  '/terms',
  '/privacy',
  '/mass-entry',
]

export const dynamic = 'force-dynamic'

export async function GET() {
  const urls = staticPages.map(path => {
    const url = `${baseUrl}${path === '' ? '/' : path}`
    return `  <url>
    <loc>${url}</loc>
    <changefreq>daily</changefreq>
    <priority>${path === '' ? '1.0' : '0.8'}</priority>
  </url>`
  })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}

