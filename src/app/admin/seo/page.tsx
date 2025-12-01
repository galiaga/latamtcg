'use client'

import { useState, useEffect } from 'react'

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

interface SEOCheckData {
  sitemap: SitemapCheck
  robots: RobotsCheck
  pages: {
    homepage: PageMetadata
    searchPage: PageMetadata
  }
}

function StatusIcon({ status }: { status: 'valid' | 'invalid' | 'warning' }) {
  if (status === 'valid') {
    return <span className="text-green-600 text-xl">✓</span>
  } else if (status === 'invalid') {
    return <span className="text-red-600 text-xl">✗</span>
  } else {
    return <span className="text-yellow-600 text-xl">⚠</span>
  }
}

function StatusBadge({ status }: { status: 'valid' | 'invalid' | 'warning' }) {
  const colors = {
    valid: 'bg-green-100 text-green-800 border-green-300',
    invalid: 'bg-red-100 text-red-800 border-red-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  }
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium border ${colors[status]}`}>
      {status.toUpperCase()}
    </span>
  )
}

export default function AdminSEOPage() {
  const [data, setData] = useState<SEOCheckData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    setAccessDenied(false)
    try {
      const response = await fetch('/api/admin/seo')
      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 403) {
          setAccessDenied(true)
          return
        }
        throw new Error(errorData.error || 'Failed to load SEO data')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-lg">Loading SEO diagnostics...</div>
        </div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-yellow-800 mb-2">Access Denied</h2>
          <p className="text-yellow-700 mb-4">
            SEO admin is only available in development mode or when ENABLE_SEO_ADMIN=true is set.
          </p>
          <p className="text-sm text-yellow-600">
            This page is restricted to prevent exposing SEO diagnostics in production.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">SEO Diagnostics</h1>
          <p className="text-gray-600">Live SEO health check for latamtcg.com</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Sitemap Check */}
      <div className="mb-6 bg-white border rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <StatusIcon status={data.sitemap.status.status} />
          <h2 className="text-xl font-semibold">Sitemap.xml</h2>
          <StatusBadge status={data.sitemap.status.status} />
        </div>
        <p className="text-gray-700 mb-4">{data.sitemap.status.message}</p>
        
        {data.sitemap.status.details && data.sitemap.status.details.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium text-red-700 mb-2">Issues:</div>
            <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
              {data.sitemap.status.details.map((detail, idx) => (
                <li key={idx}>{detail}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700 mb-2">
            URLs in Sitemap ({data.sitemap.urls.length}):
          </div>
          <div className="bg-gray-50 rounded p-3 max-h-64 overflow-y-auto">
            <ul className="space-y-1 text-sm font-mono">
              {data.sitemap.urls.map((url, idx) => (
                <li key={idx} className="text-gray-700">
                  {url}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Robots.txt Check */}
      <div className="mb-6 bg-white border rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <StatusIcon status={data.robots.status.status} />
          <h2 className="text-xl font-semibold">Robots.txt</h2>
          <StatusBadge status={data.robots.status.status} />
        </div>
        <p className="text-gray-700 mb-4">{data.robots.status.message}</p>
        
        {data.robots.status.details && data.robots.status.details.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium text-red-700 mb-2">Issues:</div>
            <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
              {data.robots.status.details.map((detail, idx) => (
                <li key={idx}>{detail}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <div className="text-sm font-medium text-gray-700">Universal Disallow</div>
            <div className={data.robots.hasUniversalDisallow ? 'text-red-600' : 'text-green-600'}>
              {data.robots.hasUniversalDisallow ? '✗ Found' : '✓ Not found'}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Sitemap Directive</div>
            <div className={data.robots.hasSitemap ? 'text-green-600' : 'text-red-600'}>
              {data.robots.hasSitemap ? `✓ ${data.robots.sitemapUrl}` : '✗ Missing'}
            </div>
          </div>
        </div>
      </div>

      {/* Page Metadata Checks */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Page Metadata</h2>
        
        {/* Homepage */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold">Homepage</h3>
            <a
              href={data.pages.homepage.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {data.pages.homepage.url}
            </a>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon status={data.pages.homepage.hasH1 && data.pages.homepage.h1Count === 1 ? 'valid' : 'invalid'} />
                <span className="font-medium">H1 Tag</span>
              </div>
              {data.pages.homepage.hasH1 ? (
                <div className="text-sm text-gray-700 ml-7">
                  Count: {data.pages.homepage.h1Count}
                  {data.pages.homepage.h1Text && (
                    <div className="mt-1 text-xs text-gray-600 italic">
                      "{data.pages.homepage.h1Text.substring(0, 60)}..."
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-red-600 ml-7">Missing</div>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon status={data.pages.homepage.hasTitle ? 'valid' : 'invalid'} />
                <span className="font-medium">Title</span>
              </div>
              {data.pages.homepage.title ? (
                <div className="text-sm text-gray-700 ml-7">
                  <div className="truncate">{data.pages.homepage.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {data.pages.homepage.title.length} chars
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-600 ml-7">Missing</div>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon status={data.pages.homepage.hasDescription ? 'valid' : 'invalid'} />
                <span className="font-medium">Meta Description</span>
              </div>
              {data.pages.homepage.description ? (
                <div className="text-sm text-gray-700 ml-7">
                  <div className="line-clamp-2">{data.pages.homepage.description}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {data.pages.homepage.description.length} chars
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-600 ml-7">Missing</div>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon status={data.pages.homepage.hasCanonical ? 'valid' : 'warning'} />
                <span className="font-medium">Canonical URL</span>
              </div>
              {data.pages.homepage.canonical ? (
                <div className="text-sm text-gray-700 ml-7 font-mono truncate">
                  {data.pages.homepage.canonical}
                </div>
              ) : (
                <div className="text-sm text-yellow-600 ml-7">Missing</div>
              )}
            </div>
          </div>
          
          {(data.pages.homepage.errors.length > 0 || data.pages.homepage.warnings.length > 0) && (
            <div className="mt-4 pt-4 border-t">
              {data.pages.homepage.errors.length > 0 && (
                <div className="mb-2">
                  <div className="text-sm font-medium text-red-700 mb-1">Errors:</div>
                  <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                    {data.pages.homepage.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.pages.homepage.warnings.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-yellow-700 mb-1">Warnings:</div>
                  <ul className="list-disc list-inside text-sm text-yellow-600 space-y-1">
                    {data.pages.homepage.warnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search Page */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold">Search Page</h3>
            <a
              href={data.pages.searchPage.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {data.pages.searchPage.url}
            </a>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon status={data.pages.searchPage.hasH1 && data.pages.searchPage.h1Count === 1 ? 'valid' : 'invalid'} />
                <span className="font-medium">H1 Tag</span>
              </div>
              {data.pages.searchPage.hasH1 ? (
                <div className="text-sm text-gray-700 ml-7">
                  Count: {data.pages.searchPage.h1Count}
                  {data.pages.searchPage.h1Text && (
                    <div className="mt-1 text-xs text-gray-600 italic">
                      "{data.pages.searchPage.h1Text.substring(0, 60)}..."
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-red-600 ml-7">Missing</div>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon status={data.pages.searchPage.hasTitle ? 'valid' : 'invalid'} />
                <span className="font-medium">Title</span>
              </div>
              {data.pages.searchPage.title ? (
                <div className="text-sm text-gray-700 ml-7">
                  <div className="truncate">{data.pages.searchPage.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {data.pages.searchPage.title.length} chars
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-600 ml-7">Missing</div>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon status={data.pages.searchPage.hasDescription ? 'valid' : 'invalid'} />
                <span className="font-medium">Meta Description</span>
              </div>
              {data.pages.searchPage.description ? (
                <div className="text-sm text-gray-700 ml-7">
                  <div className="line-clamp-2">{data.pages.searchPage.description}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {data.pages.searchPage.description.length} chars
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-600 ml-7">Missing</div>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon status={data.pages.searchPage.hasCanonical ? 'valid' : 'warning'} />
                <span className="font-medium">Canonical URL</span>
              </div>
              {data.pages.searchPage.canonical ? (
                <div className="text-sm text-gray-700 ml-7 font-mono truncate">
                  {data.pages.searchPage.canonical}
                </div>
              ) : (
                <div className="text-sm text-yellow-600 ml-7">Missing</div>
              )}
            </div>
          </div>
          
          {(data.pages.searchPage.errors.length > 0 || data.pages.searchPage.warnings.length > 0) && (
            <div className="mt-4 pt-4 border-t">
              {data.pages.searchPage.errors.length > 0 && (
                <div className="mb-2">
                  <div className="text-sm font-medium text-red-700 mb-1">Errors:</div>
                  <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                    {data.pages.searchPage.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.pages.searchPage.warnings.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-yellow-700 mb-1">Warnings:</div>
                  <ul className="list-disc list-inside text-sm text-yellow-600 space-y-1">
                    {data.pages.searchPage.warnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

