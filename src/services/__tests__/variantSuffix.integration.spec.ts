import { prisma } from '@/lib/prisma'
import { groupedSearch } from '@/services/searchQueryGroupedSimple'

describe('variantSuffix Integration Test', () => {
  it('should return variantSuffix in search results', async () => {
    // Query the search API for a card that should have variants
    const searchResult = await groupedSearch({
      q: 'Lightning Bolt',
      page: 1,
      pageSize: 10
    })

    // Assert that variantSuffix appears in the response
    expect(searchResult.primary).toBeDefined()
    expect(searchResult.primary.length).toBeGreaterThan(0)
    
    // Check if any results have variantSuffix
    const hasVariantSuffix = searchResult.primary.some(item => 
      item.variantSuffix && item.variantSuffix.length > 0
    )
    
    // At least some results should have variantSuffix
    expect(hasVariantSuffix).toBe(true)
    
    // Log the first few results for debugging
    console.log('First 3 search results:', searchResult.primary.slice(0, 3).map(item => ({
      title: item.title,
      variantSuffix: item.variantSuffix
    })))
  })

  it('should handle cards with no variants (empty variantSuffix)', async () => {
    // Query the search API for a common card
    const searchResult = await groupedSearch({
      q: 'Island',
      page: 1,
      pageSize: 10
    })

    // Assert that results are returned
    expect(searchResult.primary).toBeDefined()
    expect(searchResult.primary.length).toBeGreaterThan(0)
    
    // Check that variantSuffix field exists (even if empty)
    const firstResult = searchResult.primary[0]
    expect(firstResult).toHaveProperty('variantSuffix')
    
    // Log the first few results for debugging
    console.log('First 3 Island results:', searchResult.primary.slice(0, 3).map(item => ({
      title: item.title,
      variantSuffix: item.variantSuffix
    })))
  })

  it('should verify variantSuffix is populated in SearchIndex', async () => {
    // Check that SearchIndex has variantSuffix populated
    const searchIndexCount = await prisma.searchIndex.count({
      where: {
        variantSuffix: {
          not: null
        }
      }
    })

    const totalCount = await prisma.searchIndex.count()
    
    // At least some records should have variantSuffix
    expect(searchIndexCount).toBeGreaterThan(0)
    expect(totalCount).toBeGreaterThan(0)
    
    console.log(`SearchIndex records with variantSuffix: ${searchIndexCount} out of ${totalCount}`)
  })
})
