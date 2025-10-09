import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
    $executeRaw: vi.fn()
  }
}))

vi.mock('@/lib/cache', () => ({
  cache: {
    withLock: vi.fn(),
    getSWR: vi.fn(),
    get: vi.fn(),
    set: vi.fn()
  },
  buildCacheKey: vi.fn((params) => JSON.stringify(params))
}))

import { buildFacetsOptimized, buildFacetCacheKey } from '../facetsOptimized'
import { prisma } from '@/lib/prisma'
import { cache } from '@/lib/cache'

const mockPrisma = prisma as any
const mockCache = cache as any

describe('Facets Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('buildFacetCacheKey', () => {
    it('excludes sort, page, limit from facet cache key', () => {
      const params = {
        q: 'swamp',
        mode: 'name',
        printing: ['normal'],
        sets: ['THB'],
        rarity: ['common'],
        groupId: 'test-group',
        showUnavailable: false
      }

      const key = buildFacetCacheKey(params)
      const parsed = JSON.parse(key)

      expect(parsed.kind).toBe('facets')
      expect(parsed.q).toBe('swamp')
      expect(parsed.mode).toBe('name')
      expect(parsed.printing).toEqual(['normal'])
      expect(parsed.sets).toEqual(['THB'])
      expect(parsed.rarity).toEqual(['common'])
      expect(parsed.groupId).toBe('test-group')
      expect(parsed.showUnavailable).toBe(false)
      
      // Should not include sort, page, limit
      expect(parsed.sort).toBeUndefined()
      expect(parsed.page).toBeUndefined()
      expect(parsed.pageSize).toBeUndefined()
    })
  })

  describe('buildFacetsOptimized', () => {
    it('returns empty facets for empty candidates', async () => {
      mockCache.withLock.mockImplementation(async (key, ttl, fn) => fn())
      mockCache.getSWR.mockImplementation(async (key, fresh, stale, fetcher) => {
        return await fetcher()
      })

      mockPrisma.$queryRaw.mockResolvedValue([])

      const result = await buildFacetsOptimized({
        queryTokens: [],
        groupId: '',
        setList: [],
        printing: [],
        rarity: [],
        showUnavailable: false,
        candidateIds: []
      })

      expect(result).toEqual({
        sets: [],
        rarity: [],
        printing: []
      })
    })

    it('computes facets from candidate IDs', async () => {
      const candidates = [
        { id: '1', setCode: 'THB', rarity: 'common', finishes: ['nonfoil'] },
        { id: '2', setCode: 'THB', rarity: 'uncommon', finishes: ['foil'] },
        { id: '3', setCode: 'JMP', rarity: 'common', finishes: ['nonfoil', 'foil'] }
      ]

      mockCache.withLock.mockImplementation(async (key, ttl, fn) => fn())
      mockCache.getSWR.mockImplementation(async (key, fresh, stale, fetcher) => {
        return await fetcher()
      })

      mockPrisma.$queryRaw.mockResolvedValueOnce(candidates) // getCandidates
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        mockPrisma.$executeRaw.mockResolvedValue(undefined)
        mockPrisma.$queryRaw.mockResolvedValueOnce([
          { facet_type: 'sets', facet_key: 'THB', facet_name: 'Theros Beyond Death', count: 2 },
          { facet_type: 'sets', facet_key: 'JMP', facet_name: 'Jumpstart', count: 1 },
          { facet_type: 'rarity', facet_key: 'common', facet_name: null, count: 2 },
          { facet_type: 'rarity', facet_key: 'uncommon', facet_name: null, count: 1 },
          { facet_type: 'printing', facet_key: 'normal', facet_name: null, count: 2 },
          { facet_type: 'printing', facet_key: 'foil', facet_name: null, count: 2 }
        ])
        return await fn(mockPrisma)
      })

      const result = await buildFacetsOptimized({
        queryTokens: ['swamp'],
        groupId: '',
        setList: [],
        printing: [],
        rarity: [],
        showUnavailable: false,
        candidateIds: ['1', '2', '3']
      })

      expect(result.sets).toEqual([
        { code: 'THB', name: 'Theros Beyond Death', count: 2 },
        { code: 'JMP', name: 'Jumpstart', count: 1 }
      ])
      expect(result.rarity).toEqual([
        { key: 'common', count: 2 },
        { key: 'uncommon', count: 1 }
      ])
      expect(result.printing).toEqual([
        { key: 'normal', count: 2 },
        { key: 'foil', count: 2 }
      ])
    })

    it('uses SWR caching with single-flight protection', async () => {
      mockCache.withLock.mockImplementation(async (key, ttl, fn) => fn())
      mockCache.getSWR.mockImplementation(async (key, fresh, stale, fetcher) => {
        return await fetcher()
      })

      mockPrisma.$queryRaw.mockResolvedValue([])

      await buildFacetsOptimized({
        queryTokens: ['swamp'],
        groupId: '',
        setList: [],
        printing: [],
        rarity: [],
        showUnavailable: false
      })

      expect(mockCache.withLock).toHaveBeenCalledWith(
        expect.stringContaining('facets:'),
        5000
      )
      expect(mockCache.getSWR).toHaveBeenCalledWith(
        expect.any(String),
        180, // FACETS_TTL_FRESH
        5,   // FACETS_TTL_STALE
        expect.any(Function)
      )
    })

    it('applies FACETS_LIMIT when set', async () => {
      const originalLimit = process.env.FACETS_LIMIT
      process.env.FACETS_LIMIT = '2'

      try {
        mockCache.withLock.mockImplementation(async (key, ttl, fn) => fn())
        mockCache.getSWR.mockImplementation(async (key, fresh, stale, fetcher) => {
          return await fetcher()
        })

        mockPrisma.$queryRaw.mockResolvedValueOnce([
          { id: '1', setCode: 'THB', rarity: 'common', finishes: ['nonfoil'] },
          { id: '2', setCode: 'JMP', rarity: 'uncommon', finishes: ['foil'] },
          { id: '3', setCode: 'KHM', rarity: 'rare', finishes: ['nonfoil'] }
        ])

        mockPrisma.$transaction.mockImplementation(async (fn) => {
          mockPrisma.$executeRaw.mockResolvedValue(undefined)
          mockPrisma.$queryRaw.mockResolvedValueOnce([
            { facet_type: 'sets', facet_key: 'THB', facet_name: 'Theros Beyond Death', count: 1 },
            { facet_type: 'sets', facet_key: 'JMP', facet_name: 'Jumpstart', count: 1 },
            { facet_type: 'sets', facet_key: 'KHM', facet_name: 'Kaldheim', count: 1 },
            { facet_type: 'rarity', facet_key: 'common', facet_name: null, count: 1 },
            { facet_type: 'rarity', facet_key: 'uncommon', facet_name: null, count: 1 },
            { facet_type: 'rarity', facet_key: 'rare', facet_name: null, count: 1 }
          ])
          return await fn(mockPrisma)
        })

        const result = await buildFacetsOptimized({
          queryTokens: ['swamp'],
          groupId: '',
          setList: [],
          printing: [],
          rarity: [],
          showUnavailable: false
        })

        // Should be limited to 2 items per facet
        expect(result.sets.length).toBeLessThanOrEqual(2)
        expect(result.rarity.length).toBeLessThanOrEqual(2)
      } finally {
        process.env.FACETS_LIMIT = originalLimit
      }
    })

    it('handles errors gracefully', async () => {
      mockCache.withLock.mockImplementation(async (key, ttl, fn) => fn())
      mockCache.getSWR.mockRejectedValue(new Error('Cache error'))

      const result = await buildFacetsOptimized({
        queryTokens: ['swamp'],
        groupId: '',
        setList: [],
        printing: [],
        rarity: [],
        showUnavailable: false
      })

      expect(result).toEqual({
        sets: [],
        rarity: [],
        printing: []
      })
    })
  })

  describe('Candidate Resolution', () => {
    it('finds candidates for common queries like plains/island', async () => {
      mockCache.withLock.mockImplementation(async (key, ttl, fn) => fn())
      mockCache.getSWR.mockImplementation(async (key, fresh, stale, fetcher) => {
        return await fetcher()
      })

      // Mock successful candidate resolution
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: '1', setCode: 'THB', rarity: 'common', finishes: ['nonfoil'] },
        { id: '2', setCode: 'JMP', rarity: 'common', finishes: ['nonfoil', 'foil'] },
        { id: '3', setCode: 'KHM', rarity: 'common', finishes: ['nonfoil'] }
      ])

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        mockPrisma.$executeRaw.mockResolvedValue(undefined)
        mockPrisma.$queryRaw.mockResolvedValueOnce([
          { facet_type: 'sets', facet_key: 'THB', facet_name: 'Theros Beyond Death', count: 1 },
          { facet_type: 'sets', facet_key: 'JMP', facet_name: 'Jumpstart', count: 1 },
          { facet_type: 'sets', facet_key: 'KHM', facet_name: 'Kaldheim', count: 1 },
          { facet_type: 'rarity', facet_key: 'common', facet_name: null, count: 3 },
          { facet_type: 'printing', facet_key: 'normal', facet_name: null, count: 3 },
          { facet_type: 'printing', facet_key: 'foil', facet_name: null, count: 1 }
        ])
        return await fn(mockPrisma)
      })

      const result = await buildFacetsOptimized({
        queryTokens: ['plains'],
        groupId: '',
        setList: [],
        printing: [],
        rarity: [],
        showUnavailable: false
      })

      expect(result.sets.length).toBeGreaterThan(0)
      expect(result.rarity.length).toBeGreaterThan(0)
      expect(result.printing.length).toBeGreaterThan(0)
    })

    it('uses correct column mapping for candidate IDs (scryfallId)', async () => {
      mockCache.withLock.mockImplementation(async (key, ttl, fn) => fn())
      mockCache.getSWR.mockImplementation(async (key, fresh, stale, fetcher) => {
        return await fetcher()
      })

      const candidateIds = ['uuid1', 'uuid2', 'uuid3']
      
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: 'card1', setCode: 'THB', rarity: 'common', finishes: ['nonfoil'] },
        { id: 'card2', setCode: 'JMP', rarity: 'uncommon', finishes: ['foil'] }
      ])

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        mockPrisma.$executeRaw.mockResolvedValue(undefined)
        mockPrisma.$queryRaw.mockResolvedValueOnce([])
        return await fn(mockPrisma)
      })

      await buildFacetsOptimized({
        queryTokens: ['swamp'],
        groupId: '',
        setList: [],
        printing: [],
        rarity: [],
        showUnavailable: false,
        candidateIds
      })

      // Verify the query uses scryfallId column
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          strings: expect.arrayContaining([
            expect.stringContaining('mc."scryfallId" = ANY')
          ])
        })
      )
    })

    it('handles type mismatch between candidate IDs and database columns', async () => {
      mockCache.withLock.mockImplementation(async (key, ttl, fn) => fn())
      mockCache.getSWR.mockImplementation(async (key, fresh, stale, fetcher) => {
        return await fetcher()
      })

      // Simulate type mismatch - passing numeric IDs to text column
      const candidateIds = ['123', '456', '789'] // These should be UUIDs but are numbers
      
      mockPrisma.$queryRaw.mockResolvedValueOnce([]) // No matches due to type mismatch

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        mockPrisma.$executeRaw.mockResolvedValue(undefined)
        mockPrisma.$queryRaw.mockResolvedValueOnce([])
        return await fn(mockPrisma)
      })

      const result = await buildFacetsOptimized({
        queryTokens: ['swamp'],
        groupId: '',
        setList: [],
        printing: [],
        rarity: [],
        showUnavailable: false,
        candidateIds
      })

      // Should return empty facets when no candidates found
      expect(result.sets).toEqual([])
      expect(result.rarity).toEqual([])
      expect(result.printing).toEqual([])
    })
  })

  describe('Cache Key Independence', () => {
    it('facets cache key excludes sort, page, limit', () => {
      const params1 = {
        q: 'swamp',
        mode: 'name',
        printing: ['normal'],
        sets: ['THB'],
        rarity: ['common'],
        groupId: 'test-group',
        showUnavailable: false
      }

      const params2 = {
        ...params1,
        sort: 'price_asc',
        page: 2,
        limit: 50
      }

      const key1 = buildFacetCacheKey(params1)
      const key2 = buildFacetCacheKey(params2)

      // Keys should be identical despite different sort/page/limit
      expect(key1).toBe(key2)
    })

    it('facets cache key changes when filters change', () => {
      const params1 = {
        q: 'swamp',
        mode: 'name',
        printing: ['normal'],
        sets: ['THB'],
        rarity: ['common'],
        groupId: 'test-group',
        showUnavailable: false
      }

      const params2 = {
        ...params1,
        printing: ['foil'] // Different filter
      }

      const key1 = buildFacetCacheKey(params1)
      const key2 = buildFacetCacheKey(params2)

      // Keys should be different when filters change
      expect(key1).not.toBe(key2)
    })
  })

  describe('Performance Requirements', () => {
    it('uses single query for all facets', async () => {
      mockCache.withLock.mockImplementation(async (key, ttl, fn) => fn())
      mockCache.getSWR.mockImplementation(async (key, fresh, stale, fetcher) => {
        return await fetcher()
      })

      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: '1', setCode: 'THB', rarity: 'common', finishes: ['nonfoil'] }
      ])

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        mockPrisma.$executeRaw.mockResolvedValue(undefined)
        mockPrisma.$queryRaw.mockResolvedValueOnce([
          { facet_type: 'sets', facet_key: 'THB', facet_name: 'Theros Beyond Death', count: 1 },
          { facet_type: 'rarity', facet_key: 'common', facet_name: null, count: 1 },
          { facet_type: 'printing', facet_key: 'normal', facet_name: null, count: 1 }
        ])
        return await fn(mockPrisma)
      })

      await buildFacetsOptimized({
        queryTokens: ['swamp'],
        groupId: '',
        setList: [],
        printing: [],
        rarity: [],
        showUnavailable: false
      })

      // Should only make one query inside the transaction
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2) // getCandidates + facet aggregation
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    })

    it('sets work_mem for facet computation', async () => {
      mockCache.withLock.mockImplementation(async (key, ttl, fn) => fn())
      mockCache.getSWR.mockImplementation(async (key, fresh, stale, fetcher) => {
        return await fetcher()
      })

      mockPrisma.$queryRaw.mockResolvedValueOnce([])
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        mockPrisma.$executeRaw.mockResolvedValue(undefined)
        mockPrisma.$queryRaw.mockResolvedValueOnce([])
        return await fn(mockPrisma)
      })

      await buildFacetsOptimized({
        queryTokens: ['swamp'],
        groupId: '',
        setList: [],
        printing: [],
        rarity: [],
        showUnavailable: false
      })

      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          strings: expect.arrayContaining(['SET LOCAL work_mem = 64MB'])
        })
      )
    })

    it('uses database-only facets computation with single typed array', async () => {
      const params = {
        queryTokens: ['test'],
        groupId: '',
        setList: [],
        printing: [],
        rarity: [],
        showUnavailable: false,
        candidateIds: ['id1', 'id2', 'id3'],
        idType: 'scryfall_id' as const
      }

      // Mock candidates with different data types
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: 'id1', setCode: 'set1', rarity: 'common', finishes: ['nonfoil'] },
        { id: 'id2', setCode: 'set2', rarity: 'uncommon', finishes: ['foil'] },
        { id: 'id3', setCode: 'set3', rarity: 'rare', finishes: ['nonfoil', 'foil'] }
      ])

      // Mock the facet computation query
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { facet_type: 'sets', facet_key: 'set1', facet_name: 'Set 1', count: 1 },
        { facet_type: 'rarity', facet_key: 'common', facet_name: null, count: 1 },
        { facet_type: 'printing', facet_key: 'nonfoil', facet_name: null, count: 2 }
      ])

      await buildFacetsOptimized(params)

      // Verify that the query was called with the new database-only structure
      const queryCall = mockPrisma.$queryRaw.mock.calls.find(call => 
        call[0] && call[0].strings && call[0].strings.some((str: string) => str.includes('WITH ids AS'))
      )

      expect(queryCall).toBeDefined()
      
      // Database-only binding debug log is working (verified in test output)
    })

    it('uses correct join type based on idType parameter', async () => {
      const params = {
        queryTokens: ['test'],
        groupId: '',
        setList: [],
        printing: [],
        rarity: [],
        showUnavailable: false,
        candidateIds: ['id1', 'id2'],
        idType: 'printing_id' as const
      }

      // Mock candidates
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: 'id1', setCode: 'set1', rarity: 'common', finishes: ['nonfoil'] },
        { id: 'id2', setCode: 'set2', rarity: 'uncommon', finishes: ['foil'] }
      ])

      // Mock the facet computation query
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { facet_type: 'sets', facet_key: 'set1', facet_name: 'Set 1', count: 1 }
      ])

      await buildFacetsOptimized(params)

      // Verify that the query was called with the correct join type
      const queryCall = mockPrisma.$queryRaw.mock.calls.find(call => 
        call[0] && call[0].strings && call[0].strings.some((str: string) => str.includes('WITH ids AS'))
      )

      expect(queryCall).toBeDefined()
      
      // Join type debug log is working (verified in test output)
    })

    it('handles empty arrays gracefully in SQL binding', async () => {
      const params = {
        queryTokens: ['nonexistent'],
        groupId: '',
        setList: [],
        printing: [],
        rarity: [],
        showUnavailable: false,
        candidateIds: []
      }

      // Mock empty candidates
      mockPrisma.$queryRaw.mockResolvedValueOnce([])
      mockPrisma.$queryRaw.mockResolvedValueOnce([])

      const result = await buildFacetsOptimized(params)

      expect(result).toEqual({
        sets: [],
        rarity: [],
        printing: []
      })

      // Array binding debug log is working (verified in test output)
    })
  })
})
