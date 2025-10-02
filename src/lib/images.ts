export function getScryfallNormalUrl(id: string): string {
  const trimmed = String(id || '').trim()
  if (trimmed.length < 2) return ''
  const a = trimmed[0]
  const b = trimmed[1]
  return `https://cards.scryfall.io/normal/front/${a}/${b}/${trimmed}.jpg`
}

export function getScryfallSmallUrl(id: string): string {
  const trimmed = String(id || '').trim()
  if (trimmed.length < 2) return ''
  const a = trimmed[0]
  const b = trimmed[1]
  return `https://cards.scryfall.io/small/front/${a}/${b}/${trimmed}.jpg`
}


