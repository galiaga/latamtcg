#!/usr/bin/env node

/**
 * Search Performance Test Script
 * 
 * This script tests the performance improvements of the optimized search implementation.
 * It can be run to compare the original vs optimized search performance.
 */

import { groupedSearchOriginal, groupedSearchOptimized } from '../src/services/searchQueryGroupedSimple'

async function testSearchPerformance() {
  const testQueries = [
    'aabcdefgzzzz', // The problematic query from the logs
    'swamp',        // Common card name
    'lightning bolt', // Multi-word query
    'black lotus',  // Expensive card
    'basic land'    // Common type
  ]

  console.log('🔍 Testing Search Performance Optimizations\n')
  console.log('=' .repeat(60))

  for (const query of testQueries) {
    console.log(`\n📝 Testing query: "${query}"`)
    console.log('-'.repeat(40))

    // Test original implementation
    const originalStart = Date.now()
    try {
      const originalResult = await groupedSearchOriginal({
        q: query,
        page: 1,
        pageSize: 25,
        printing: [],
        sets: [],
        rarity: [],
        showUnavailable: false
      })
      const originalTime = Date.now() - originalStart
      
      console.log(`✅ Original: ${originalTime}ms (${originalResult.totalResults} results)`)
    } catch (error) {
      console.log(`❌ Original failed: ${error}`)
    }

    // Test optimized implementation
    const optimizedStart = Date.now()
    try {
      const optimizedResult = await groupedSearchOptimized({
        q: query,
        page: 1,
        pageSize: 25,
        printing: [],
        sets: [],
        rarity: [],
        showUnavailable: false
      })
      const optimizedTime = Date.now() - optimizedStart
      
      console.log(`🚀 Optimized: ${optimizedTime}ms (${optimizedResult.totalResults} results)`)
    } catch (error) {
      console.log(`❌ Optimized failed: ${error}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✨ Performance test completed!')
}

// Run the test if this script is executed directly
if (require.main === module) {
  testSearchPerformance().catch(console.error)
}

export { testSearchPerformance }
