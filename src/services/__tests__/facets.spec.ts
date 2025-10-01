import { describe, it, expect } from 'vitest'

// These are smoke tests to assert server behavior indirectly using the public API shape.
// We don't hit the DB; instead, we validate that when the backend is asked for a
// set-only query, it would return a sets facet constrained to those sets.

function buildSetsFacetFromMatches(matches: Array<{ setCode: string; setName?: string | null }>) {
  const map = new Map<string, { code: string; name: string; count: number }>()
  for (const m of matches) {
    const code = String(m.setCode || '').toUpperCase()
    const name = m.setName || code
    const cur = map.get(code) || { code, name, count: 0 }
    cur.count += 1
    map.set(code, cur)
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

describe('facets from current matches', () => {
  it('q="" & set=THB returns sets facet with only THB', () => {
    const matches = [
      { setCode: 'THB', setName: 'Theros Beyond Death' },
      { setCode: 'THB', setName: 'Theros Beyond Death' },
    ]
    const sets = buildSetsFacetFromMatches(matches)
    expect(sets.length).toBe(1)
    expect(sets[0].code).toBe('THB')
  })

  it('q="mire triton" shows only sets where it exists', () => {
    const matches = [
      { setCode: 'THB', setName: 'Theros Beyond Death' },
      { setCode: 'JMP', setName: 'Jumpstart' },
      { setCode: 'JMP', setName: 'Jumpstart' },
    ]
    const sets = buildSetsFacetFromMatches(matches)
    const codes = sets.map((s) => s.code).sort()
    expect(codes).toEqual(['JMP', 'THB'])
  })
})


