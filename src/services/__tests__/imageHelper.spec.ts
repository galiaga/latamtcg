import { describe, it, expect } from 'vitest'
import { getScryfallNormalUrl } from '@/lib/images'

describe('getScryfallNormalUrl', () => {
  it('builds URL from UUID', () => {
    const id = 'a1234567-89ab-4cde-f012-3456789abcde'
    const url = getScryfallNormalUrl(id)
    expect(url).toBe('https://cards.scryfall.io/normal/front/a/1/a1234567-89ab-4cde-f012-3456789abcde.jpg')
  })

  it('returns empty for short ids', () => {
    expect(getScryfallNormalUrl('')).toBe('')
    expect(getScryfallNormalUrl('x')).toBe('')
  })
})


