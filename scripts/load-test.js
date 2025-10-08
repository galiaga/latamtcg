import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const VU = parseInt(__ENV.VU || '10')
const DURATION = __ENV.DURATION || '30s'

export const options = {
  stages: [
    { duration: '5s', target: VU }, // Ramp up
    { duration: DURATION, target: VU }, // Stay at target
    { duration: '5s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests under 200ms
    errors: ['rate<0.005'], // Error rate under 0.5%
  },
}

export default function () {
  const scenarios = [
    () => testSearchAPI(),
    () => testSuggestionsAPI(),
    () => testSSRSearch(),
  ]
  
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]
  scenario()
  
  sleep(1)
}

function testSearchAPI() {
  const queries = [
    'lightning bolt',
    'black lotus',
    'tarmogoyf',
    'jace',
    'force of will',
    'fetch land',
    'shock land',
    'dual land',
    'planeswalker',
    'artifact',
  ]
  
  const query = queries[Math.floor(Math.random() * queries.length)]
  const params = {
    q: query,
    page: Math.floor(Math.random() * 3) + 1,
    limit: '25',
  }
  
  const url = `${BASE_URL}/api/search?${new URLSearchParams(params)}`
  const response = http.get(url)
  
  const success = check(response, {
    'search API status is 200': (r) => r.status === 200,
    'search API response time < 200ms': (r) => r.timings.duration < 200,
    'search API has results': (r) => {
      try {
        const data = JSON.parse(r.body)
        return Array.isArray(data.primary) && data.primary.length > 0
      } catch {
        return false
      }
    },
  })
  
  errorRate.add(!success)
}

function testSuggestionsAPI() {
  const prefixes = ['light', 'black', 'blue', 'red', 'green', 'white', 'art', 'plan', 'cre', 'inst']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  
  const params = {
    q: prefix,
    limit: '10',
    game: 'mtg',
    lang: 'en',
  }
  
  const url = `${BASE_URL}/api/search/suggestions?${new URLSearchParams(params)}`
  const response = http.get(url)
  
  const success = check(response, {
    'suggestions API status is 200': (r) => r.status === 200,
    'suggestions API response time < 150ms': (r) => r.timings.duration < 150,
    'suggestions API has suggestions': (r) => {
      try {
        const data = JSON.parse(r.body)
        return Array.isArray(data) && data.length > 0
      } catch {
        return false
      }
    },
  })
  
  errorRate.add(!success)
}

function testSSRSearch() {
  const queries = ['bolt', 'lotus', 'goyf', 'jace', 'force']
  const query = queries[Math.floor(Math.random() * queries.length)]
  
  const params = {
    q: query,
    page: '1',
  }
  
  const url = `${BASE_URL}/mtg/search?${new URLSearchParams(params)}`
  const response = http.get(url)
  
  const success = check(response, {
    'SSR search status is 200': (r) => r.status === 200,
    'SSR search response time < 400ms': (r) => r.timings.duration < 400,
    'SSR search has content': (r) => r.body.includes('SearchResultsGrid'),
    'SSR search has no client refetch': (r) => !r.body.includes('client fetch suppressed'),
  })
  
  errorRate.add(!success)
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)']
  const errorRate = data.metrics.errors.values.rate
  
  console.log(`\n=== Load Test Results ===`)
  console.log(`P95 Response Time: ${p95.toFixed(2)}ms`)
  console.log(`Error Rate: ${(errorRate * 100).toFixed(2)}%`)
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`)
  
  // Check thresholds
  const p95Pass = p95 < 200
  const errorPass = errorRate < 0.005
  
  console.log(`\n=== Thresholds ===`)
  console.log(`P95 < 200ms: ${p95Pass ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Error Rate < 0.5%: ${errorPass ? '✅ PASS' : '❌ FAIL'}`)
  
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
  }
}
