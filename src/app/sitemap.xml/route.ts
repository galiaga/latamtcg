import { NextResponse } from 'next/server'

const baseUrl = 'https://latamtcg.com'

// Main public pages with priorities and change frequencies
// Priority: 1.0 = homepage, 0.9 = main features, 0.8 = important pages, 0.7 = secondary pages
// changefreq values: always, hourly, daily, weekly, monthly, yearly, never
const staticPages: Array<{
  path: string
  priority: string
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly'
}> = [
  { path: '', priority: '1.0', changefreq: 'daily' }, // Homepage
  { path: '/mtg/search', priority: '0.9', changefreq: 'daily' }, // Main search
  { path: '/mtg/sets', priority: '0.9', changefreq: 'weekly' }, // Sets page
  { path: '/search/advanced', priority: '0.8', changefreq: 'weekly' }, // Advanced search
  { path: '/mtg', priority: '0.8', changefreq: 'daily' }, // MTG landing page
  { path: '/how-it-works', priority: '0.8', changefreq: 'monthly' },
  { path: '/help', priority: '0.8', changefreq: 'monthly' },
  { path: '/contact', priority: '0.7', changefreq: 'monthly' },
  { path: '/returns', priority: '0.7', changefreq: 'monthly' },
  { path: '/terms', priority: '0.6', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.6', changefreq: 'yearly' },
  { path: '/mass-entry', priority: '0.8', changefreq: 'weekly' },
]

export const dynamic = 'force-dynamic'

export async function GET() {
  // Get current date in ISO 8601 format for lastmod
  const lastmod = new Date().toISOString().split('T')[0]

  const urls = staticPages.map(({ path, priority, changefreq }) => {
    const url = `${baseUrl}${path === '' ? '/' : path}`
    // Escape XML special characters in URL (though URLs should be safe)
    const escapedUrl = url
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
    
    return `  <url>
    <loc>${escapedUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
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

