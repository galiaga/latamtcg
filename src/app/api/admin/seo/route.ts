import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL || 'https://latamtcg.com'

interface SEOStatus {
  status: 'valid' | 'invalid' | 'warning'
  message: string
  details?: string[]
}

interface SitemapCheck {
  status: SEOStatus
  urls: string[]
  errors: string[]
}

interface RobotsCheck {
  status: SEOStatus
  hasUniversalDisallow: boolean
  hasSitemap: boolean
  sitemapUrl: string | null
}

interface PageMetadata {
  url: string
  hasH1: boolean
  h1Count: number
  h1Text?: string
  hasTitle: boolean
  title?: string
  hasDescription: boolean
  description?: string
  hasCanonical: boolean
  canonical?: string
  errors: string[]
  warnings: string[]
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'LatamTCG-SEO-Check/1.0',
    },
    cache: 'no-store',
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return await response.text()
}

function parseSitemapXML(xml: string): { urls: string[]; errors: string[] } {
  const urls: string[] = []
  const errors: string[] = []
  
  if (!xml.trim().startsWith('<?xml')) {
    errors.push('Missing XML declaration')
  }
  
  if (!xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
    errors.push('Missing or incorrect urlset namespace')
  }
  
  const urlMatches = xml.match(/<loc>(.*?)<\/loc>/g)
  if (!urlMatches || urlMatches.length === 0) {
    errors.push('No URLs found in sitemap')
  } else {
    urlMatches.forEach(match => {
      const url = match.replace(/<\/?loc>/g, '').trim()
      if (url) {
        urls.push(url)
      } else {
        errors.push('Found empty URL in sitemap')
      }
    })
  }
  
  return { urls, errors }
}

function extractH1(html: string): { count: number; text?: string } {
  const h1Matches = html.match(/<h1[^>]*>(.*?)<\/h1>/gi)
  if (!h1Matches || h1Matches.length === 0) {
    return { count: 0 }
  }
  
  const firstMatch = h1Matches[0].match(/<h1[^>]*>(.*?)<\/h1>/i)
  const text = firstMatch ? firstMatch[1].replace(/<[^>]*>/g, '').trim() : undefined
  
  return { count: h1Matches.length, text }
}

function extractTitle(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
  return titleMatch ? titleMatch[1].trim() : null
}

function extractMetaDescription(html: string): string | null {
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i)
  if (descMatch) return descMatch[1].trim()
  
  const ogMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i)
  return ogMatch ? ogMatch[1].trim() : null
}

function extractCanonical(html: string): string | null {
  const linkMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/i)
  if (linkMatch) return linkMatch[1].trim()
  
  const ogMatch = html.match(/<meta\s+property=["']og:url["']\s+content=["'](.*?)["']/i)
  return ogMatch ? ogMatch[1].trim() : null
}

async function checkSitemap(): Promise<SitemapCheck> {
  try {
    const xml = await fetchText(`${BASE_URL}/sitemap.xml`)
    const { urls, errors } = parseSitemapXML(xml)
    
    // Validate URLs
    const urlErrors: string[] = []
    urls.forEach((url, index) => {
      if (!url.startsWith('https://latamtcg.com')) {
        urlErrors.push(`URL ${index + 1} uses wrong domain: ${url}`)
      }
      if (url.includes('www.latamtcg.com')) {
        urlErrors.push(`URL contains www subdomain: ${url}`)
      }
      if (url.startsWith('http://')) {
        urlErrors.push(`URL uses HTTP instead of HTTPS: ${url}`)
      }
    })
    
    const allErrors = [...errors, ...urlErrors]
    
    return {
      status: {
        status: allErrors.length === 0 ? 'valid' : 'invalid',
        message: allErrors.length === 0 
          ? `Valid sitemap with ${urls.length} URLs`
          : `Invalid sitemap: ${allErrors.length} error(s)`,
        details: allErrors.length > 0 ? allErrors : undefined,
      },
      urls,
      errors: allErrors,
    }
  } catch (error) {
    return {
      status: {
        status: 'invalid',
        message: `Failed to fetch sitemap: ${error instanceof Error ? error.message : String(error)}`,
      },
      urls: [],
      errors: [error instanceof Error ? error.message : String(error)],
    }
  }
}

async function checkRobots(): Promise<RobotsCheck> {
  try {
    const robots = await fetchText(`${BASE_URL}/robots.txt`)
    const lines = robots.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    
    let hasUniversalDisallow = false
    let currentUserAgent = ''
    let sitemapUrl: string | null = null
    
    for (const line of lines) {
      if (line.toLowerCase().startsWith('user-agent:')) {
        currentUserAgent = line.substring(11).trim()
      } else if (line.toLowerCase().startsWith('disallow:')) {
        const path = line.substring(9).trim()
        if (path === '/' && (currentUserAgent === '*' || currentUserAgent === '')) {
          hasUniversalDisallow = true
        }
      } else if (line.toLowerCase().startsWith('sitemap:')) {
        sitemapUrl = line.substring(8).trim()
      }
    }
    
    const errors: string[] = []
    if (hasUniversalDisallow) {
      errors.push('Found "Disallow: /" for User-agent: * (blocks all crawlers)')
    }
    if (!sitemapUrl) {
      errors.push('Missing Sitemap directive')
    } else if (sitemapUrl !== 'https://latamtcg.com/sitemap.xml') {
      errors.push(`Sitemap URL incorrect: ${sitemapUrl} (expected: https://latamtcg.com/sitemap.xml)`)
    }
    
    return {
      status: {
        status: errors.length === 0 ? 'valid' : 'invalid',
        message: errors.length === 0 ? 'Valid robots.txt' : `Invalid robots.txt: ${errors.join(', ')}`,
        details: errors.length > 0 ? errors : undefined,
      },
      hasUniversalDisallow,
      hasSitemap: !!sitemapUrl,
      sitemapUrl,
    }
  } catch (error) {
    return {
      status: {
        status: 'invalid',
        message: `Failed to fetch robots.txt: ${error instanceof Error ? error.message : String(error)}`,
      },
      hasUniversalDisallow: false,
      hasSitemap: false,
      sitemapUrl: null,
    }
  }
}

async function checkPageMetadata(url: string): Promise<PageMetadata> {
  const result: PageMetadata = {
    url,
    hasH1: false,
    h1Count: 0,
    hasTitle: false,
    hasDescription: false,
    hasCanonical: false,
    errors: [],
    warnings: [],
  }
  
  try {
    const html = await fetchText(url)
    
    // Check H1
    const h1Info = extractH1(html)
    result.h1Count = h1Info.count
    result.hasH1 = h1Info.count > 0
    result.h1Text = h1Info.text
    
    if (h1Info.count === 0) {
      result.errors.push('No <h1> tag found')
    } else if (h1Info.count > 1) {
      result.errors.push(`Found ${h1Info.count} <h1> tags (should be exactly 1)`)
    }
    
    // Check title
    const title = extractTitle(html)
    result.hasTitle = !!title
    result.title = title || undefined
    
    if (!title) {
      result.errors.push('No <title> tag found')
    } else if (title.trim() === '') {
      result.errors.push('<title> tag is empty')
    } else {
      if (title.length < 30) {
        result.warnings.push(`Title is very short (${title.length} chars)`)
      } else if (title.length > 70) {
        result.warnings.push(`Title is long (${title.length} chars), may be truncated`)
      }
    }
    
    // Check description
    const description = extractMetaDescription(html)
    result.hasDescription = !!description
    result.description = description || undefined
    
    if (!description) {
      result.errors.push('No meta description found')
    } else if (description.trim() === '') {
      result.errors.push('Meta description is empty')
    } else {
      if (description.length < 50) {
        result.warnings.push(`Meta description is short (${description.length} chars)`)
      } else if (description.length > 160) {
        result.warnings.push(`Meta description is long (${description.length} chars), may be truncated`)
      }
    }
    
    // Check canonical
    const canonical = extractCanonical(html)
    result.hasCanonical = !!canonical
    result.canonical = canonical || undefined
    
    if (!canonical) {
      result.warnings.push('No canonical link found')
    } else {
      if (!canonical.startsWith(BASE_URL)) {
        result.errors.push(`Canonical URL doesn't match metadataBase: ${canonical}`)
      }
    }
    
  } catch (error) {
    result.errors.push(`Failed to fetch page: ${error instanceof Error ? error.message : String(error)}`)
  }
  
  return result
}

export async function GET(request: NextRequest) {
  // Only allow in development or if ENABLE_SEO_ADMIN is set
  const isDev = process.env.NODE_ENV === 'development'
  const isEnabled = process.env.ENABLE_SEO_ADMIN === 'true'
  
  if (!isDev && !isEnabled) {
    return NextResponse.json(
      { error: 'SEO admin is only available in development or when ENABLE_SEO_ADMIN=true' },
      { status: 403 }
    )
  }
  
  try {
    const [sitemap, robots, homepage, searchPage] = await Promise.all([
      checkSitemap(),
      checkRobots(),
      checkPageMetadata(BASE_URL),
      checkPageMetadata(`${BASE_URL}/mtg/search`),
    ])
    
    return NextResponse.json({
      sitemap,
      robots,
      pages: {
        homepage,
        searchPage,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to check SEO: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}

