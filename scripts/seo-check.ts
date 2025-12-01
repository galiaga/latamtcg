#!/usr/bin/env tsx
/**
 * SEO Health Check Script
 * 
 * Validates:
 * - Sitemap.xml structure and URLs
 * - Robots.txt configuration
 * - HTML pages for SEO elements (h1, title, meta description, canonical)
 */

const BASE_URL = 'https://latamtcg.com'

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

interface CheckResult {
  name: string
  passed: boolean
  warnings: string[]
  errors: string[]
}

const results: CheckResult[] = []

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title: string) {
  console.log('')
  log(`\n${'='.repeat(60)}`, 'cyan')
  log(`  ${title}`, 'bright')
  log('='.repeat(60), 'cyan')
}

function logResult(result: CheckResult) {
  const status = result.passed ? '✓ PASSED' : '✗ FAILED'
  const statusColor = result.passed ? 'green' : 'red'
  
  log(`\n${status}`, statusColor)
  log(`  ${result.name}`, 'bright')
  
  if (result.errors.length > 0) {
    log(`\n  Errors:`, 'red')
    result.errors.forEach(error => log(`    - ${error}`, 'red'))
  }
  
  if (result.warnings.length > 0) {
    log(`\n  Warnings:`, 'yellow')
    result.warnings.forEach(warning => log(`    - ${warning}`, 'yellow'))
  }
  
  results.push(result)
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'SEO-Health-Check/1.0',
    },
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return await response.text()
}

async function fetchHTML(url: string): Promise<string> {
  return await fetchText(url)
}

// XML parsing helpers
function parseSitemapXML(xml: string): { urls: string[]; errors: string[] } {
  const urls: string[] = []
  const errors: string[] = []
  
  // Check for XML declaration
  if (!xml.trim().startsWith('<?xml')) {
    errors.push('Missing XML declaration')
  }
  
  // Check for urlset namespace
  if (!xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
    errors.push('Missing or incorrect urlset namespace')
  }
  
  // Extract URLs using regex (simple but effective for sitemap)
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

// HTML parsing helpers
function extractH1Count(html: string): number {
  const h1Matches = html.match(/<h1[^>]*>.*?<\/h1>/gi)
  return h1Matches ? h1Matches.length : 0
}

function extractTitle(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
  return titleMatch ? titleMatch[1].trim() : null
}

function extractMetaDescription(html: string): string | null {
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i)
  if (descMatch) return descMatch[1].trim()
  
  // Try with property attribute (OpenGraph)
  const ogMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i)
  return ogMatch ? ogMatch[1].trim() : null
}

function extractCanonical(html: string): string | null {
  // Check link rel="canonical"
  const linkMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/i)
  if (linkMatch) return linkMatch[1].trim()
  
  // Check meta property="og:url"
  const ogMatch = html.match(/<meta\s+property=["']og:url["']\s+content=["'](.*?)["']/i)
  return ogMatch ? ogMatch[1].trim() : null
}

// Check functions
async function checkSitemap(): Promise<CheckResult> {
  const result: CheckResult = {
    name: 'Sitemap.xml Validation',
    passed: true,
    warnings: [],
    errors: [],
  }
  
  try {
    log('Fetching sitemap.xml...', 'blue')
    const xml = await fetchText(`${BASE_URL}/sitemap.xml`)
    
    // Parse XML
    const { urls, errors: parseErrors } = parseSitemapXML(xml)
    result.errors.push(...parseErrors)
    
    // Validate URLs
    if (urls.length === 0) {
      result.errors.push('No URLs found in sitemap')
      result.passed = false
    } else {
      log(`Found ${urls.length} URLs`, 'green')
      
      urls.forEach((url, index) => {
        // Check URL format
        if (!url.startsWith('https://latamtcg.com')) {
          result.errors.push(`URL ${index + 1} uses wrong domain: ${url}`)
          result.passed = false
        }
        
        // Check for empty or malformed URLs
        if (url === '' || url === 'https://latamtcg.com' || url === 'https://latamtcg.com/') {
          // Homepage is OK, but check if it's the only one
          if (urls.length === 1 && url === 'https://latamtcg.com/') {
            result.warnings.push('Sitemap only contains homepage')
          }
        }
        
        // Check for www subdomain
        if (url.includes('www.latamtcg.com')) {
          result.errors.push(`URL contains www subdomain: ${url}`)
          result.passed = false
        }
        
        // Check for http instead of https
        if (url.startsWith('http://')) {
          result.errors.push(`URL uses HTTP instead of HTTPS: ${url}`)
          result.passed = false
        }
      })
    }
    
    // Check XML structure
    if (!xml.includes('<urlset')) {
      result.errors.push('Missing <urlset> element')
      result.passed = false
    }
    
    if (!xml.includes('</urlset>')) {
      result.errors.push('Missing closing </urlset> tag')
      result.passed = false
    }
    
  } catch (error) {
    result.errors.push(`Failed to fetch sitemap: ${error instanceof Error ? error.message : String(error)}`)
    result.passed = false
  }
  
  return result
}

async function checkRobots(): Promise<CheckResult> {
  const result: CheckResult = {
    name: 'Robots.txt Validation',
    passed: true,
    warnings: [],
    errors: [],
  }
  
  try {
    log('Fetching robots.txt...', 'blue')
    const robots = await fetchText(`${BASE_URL}/robots.txt`)
    
    const lines = robots.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    
    // Check for "Disallow: /" for User-agent: *
    let foundUniversalDisallow = false
    let currentUserAgent = ''
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      if (line.toLowerCase().startsWith('user-agent:')) {
        currentUserAgent = line.substring(11).trim()
      } else if (line.toLowerCase().startsWith('disallow:')) {
        const path = line.substring(9).trim()
        if (path === '/' && (currentUserAgent === '*' || currentUserAgent === '')) {
          foundUniversalDisallow = true
          result.errors.push('Found "Disallow: /" for User-agent: * (blocks all crawlers)')
          result.passed = false
        }
      }
    }
    
    // Check for sitemap line
    const sitemapLine = lines.find(l => l.toLowerCase().startsWith('sitemap:'))
    if (!sitemapLine) {
      result.errors.push('Missing Sitemap directive')
      result.passed = false
    } else {
      const sitemapUrl = sitemapLine.substring(8).trim()
      if (sitemapUrl !== 'https://latamtcg.com/sitemap.xml') {
        result.errors.push(`Sitemap URL incorrect: ${sitemapUrl} (expected: https://latamtcg.com/sitemap.xml)`)
        result.passed = false
      } else {
        log('Sitemap directive found and correct', 'green')
      }
    }
    
    if (!foundUniversalDisallow) {
      log('No universal "Disallow: /" found', 'green')
    }
    
  } catch (error) {
    result.errors.push(`Failed to fetch robots.txt: ${error instanceof Error ? error.message : String(error)}`)
    result.passed = false
  }
  
  return result
}

async function checkHTMLPage(url: string, pageName: string): Promise<CheckResult> {
  const result: CheckResult = {
    name: `HTML SEO Check: ${pageName}`,
    passed: true,
    warnings: [],
    errors: [],
  }
  
  try {
    log(`Fetching ${pageName}...`, 'blue')
    const html = await fetchHTML(url)
    
    // Check for h1
    const h1Count = extractH1Count(html)
    if (h1Count === 0) {
      result.errors.push('No <h1> tag found')
      result.passed = false
    } else if (h1Count > 1) {
      result.errors.push(`Found ${h1Count} <h1> tags (should be exactly 1)`)
      result.passed = false
    } else {
      log('Found exactly 1 <h1> tag', 'green')
    }
    
    // Check for title
    const title = extractTitle(html)
    if (!title) {
      result.errors.push('No <title> tag found')
      result.passed = false
    } else if (title.trim() === '') {
      result.errors.push('<title> tag is empty')
      result.passed = false
    } else {
      log(`Title found: "${title.substring(0, 60)}${title.length > 60 ? '...' : ''}"`, 'green')
      
      // Warn if title is too short or too long
      if (title.length < 30) {
        result.warnings.push(`Title is very short (${title.length} chars), consider making it more descriptive`)
      } else if (title.length > 70) {
        result.warnings.push(`Title is long (${title.length} chars), may be truncated in search results`)
      }
    }
    
    // Check for meta description
    const description = extractMetaDescription(html)
    if (!description) {
      result.errors.push('No meta description found')
      result.passed = false
    } else if (description.trim() === '') {
      result.errors.push('Meta description is empty')
      result.passed = false
    } else {
      log(`Meta description found: "${description.substring(0, 80)}${description.length > 80 ? '...' : ''}"`, 'green')
      
      // Warn if description is too short or too long
      if (description.length < 50) {
        result.warnings.push(`Meta description is short (${description.length} chars), consider making it more descriptive`)
      } else if (description.length > 160) {
        result.warnings.push(`Meta description is long (${description.length} chars), may be truncated in search results`)
      }
    }
    
    // Check canonical URL
    const canonical = extractCanonical(html)
    if (!canonical) {
      result.warnings.push('No canonical link found (check if using metadataBase in Next.js)')
    } else {
      log(`Canonical found: ${canonical}`, 'green')
      
      // Check if canonical matches expected base
      if (!canonical.startsWith(BASE_URL)) {
        result.errors.push(`Canonical URL doesn't match metadataBase: ${canonical}`)
        result.passed = false
      } else {
        // For homepage, canonical should be exactly BASE_URL or BASE_URL/
        if (url === BASE_URL || url === `${BASE_URL}/`) {
          if (canonical !== BASE_URL && canonical !== `${BASE_URL}/`) {
            result.warnings.push(`Homepage canonical should be ${BASE_URL} or ${BASE_URL}/, got: ${canonical}`)
          }
        }
      }
    }
    
  } catch (error) {
    result.errors.push(`Failed to fetch page: ${error instanceof Error ? error.message : String(error)}`)
    result.passed = false
  }
  
  return result
}

// Main execution
async function main() {
  log('\n🔍 SEO Health Check', 'bright')
  log(`Checking: ${BASE_URL}\n`, 'cyan')
  
  try {
    // Check sitemap
    logSection('1. Sitemap.xml Check')
    const sitemapResult = await checkSitemap()
    logResult(sitemapResult)
    
    // Check robots.txt
    logSection('2. Robots.txt Check')
    const robotsResult = await checkRobots()
    logResult(robotsResult)
    
    // Check homepage
    logSection('3. Homepage HTML Check')
    const homepageResult = await checkHTMLPage(BASE_URL, 'Homepage')
    logResult(homepageResult)
    
    // Check search page
    logSection('4. Search Page HTML Check')
    const searchResult = await checkHTMLPage(`${BASE_URL}/mtg/search`, 'Search Page')
    logResult(searchResult)
    
    // Summary
    logSection('Summary')
    const totalChecks = results.length
    const passedChecks = results.filter(r => r.passed).length
    const failedChecks = totalChecks - passedChecks
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0)
    
    log(`\nTotal Checks: ${totalChecks}`, 'bright')
    log(`Passed: ${passedChecks}`, passedChecks === totalChecks ? 'green' : 'yellow')
    log(`Failed: ${failedChecks}`, failedChecks > 0 ? 'red' : 'green')
    log(`Errors: ${totalErrors}`, totalErrors > 0 ? 'red' : 'green')
    log(`Warnings: ${totalWarnings}`, totalWarnings > 0 ? 'yellow' : 'green')
    
    if (failedChecks > 0 || totalErrors > 0) {
      log('\n❌ SEO health check FAILED', 'red')
      process.exit(1)
    } else if (totalWarnings > 0) {
      log('\n⚠️  SEO health check passed with warnings', 'yellow')
      process.exit(0)
    } else {
      log('\n✅ SEO health check PASSED', 'green')
      process.exit(0)
    }
    
  } catch (error) {
    log(`\n❌ Fatal error: ${error instanceof Error ? error.message : String(error)}`, 'red')
    process.exit(1)
  }
}

main()

