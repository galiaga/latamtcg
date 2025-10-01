import { describe, it, expect } from 'vitest'

function isAllowed(card: any, excludedSetTypes: Set<string>): boolean {
  const isPaper = !card?.digital && Array.isArray(card?.games) && card.games.includes('paper')
  const isEnglish = card?.lang === 'en'
  const type: string | undefined = card?.set_type
  return isPaper && isEnglish && (!type || !excludedSetTypes.has(type))
}

describe('ingest filter (paper-only, non-digital, english)', () => {
  const excluded = new Set<string>(['token','memorabilia','alchemy','minigame'])
  it('keeps paper english', () => {
    const card = { digital: false, games: ['paper','mtgo'], lang: 'en' }
    expect(isAllowed(card, excluded)).toBe(true)
  })
  it('drops digital', () => {
    const card = { digital: true, games: ['mtgo'], lang: 'en' }
    expect(isAllowed(card, excluded)).toBe(false)
  })
  it('drops non-paper games', () => {
    const card = { digital: false, games: ['arena'], lang: 'en' }
    expect(isAllowed(card, excluded)).toBe(false)
  })
  it('drops non-english when required', () => {
    const card = { digital: false, games: ['paper'], lang: 'es' }
    expect(isAllowed(card, excluded)).toBe(false)
  })
  it('drops excluded set types', () => {
    const card = { digital: false, games: ['paper'], lang: 'en', set_type: 'token' }
    expect(isAllowed(card, excluded)).toBe(false)
  })
})


