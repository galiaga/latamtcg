export type MtgCard = {
  finishes?: string[] | null
  promoTypes?: string[] | null
  frameEffects?: string[] | null
  borderColor?: string | null
}

export function formatCardVariant(card: MtgCard) {
  const finishes = (card.finishes ?? []).map(s => s.toLowerCase())
  const promos = (card.promoTypes ?? []).map(s => s.toLowerCase())
  const frames = (card.frameEffects ?? []).map(s => s.toLowerCase())

  const tags: string[] = []

  // Frame Effects
  const FRAME_TAGS_ORDERED: Array<[string, string]> = [
    ["showcase", "Showcase"],
    ["showcaselegendary", "Showcase"],
    ["extendedart", "Extended Art"],
    ["borderless", "Borderless"],
    ["retro", "Retro Frame"],
    ["shatteredglass", "Shattered Glass"],
    ["fullart", "Full Art"],
    ["inverteddark", "Inverted Dark"],
    ["future", "Future Shifted"],
    ["textless", "Textless"]
  ]
  for (const [k, label] of FRAME_TAGS_ORDERED) {
    if (frames.includes(k)) tags.push(label)
  }

  // Foil Variant (any promoTypes ending in 'foil')
  const FOIL_EXCEPTIONS: Record<string, string> = {
    doublerainbow: "Double Rainbow",
    firstplacefoil: "First Place Foil"
  }
  const foilVariant = promos.find(p => p.endsWith("foil"))
  if (foilVariant) {
    const label =
      FOIL_EXCEPTIONS[foilVariant] ??
      foilVariant
        .replace(/foil$/i, "")
        .replace(/[_-]+/g, " ")
        .trim()
        .replace(/\b\w/g, c => c.toUpperCase()) + " Foil"
    tags.push(label)
  }

  // Base Finish - only Etched
  const isEtched = finishes.includes("etched")
  if (isEtched) tags.push("Etched")

  // Borderless (from borderColor field) - add last so it appears at the end
  if (card.borderColor?.toLowerCase() === 'borderless') {
    tags.push('Borderless')
  }

  // Reorder tags so Borderless appears last
  const reorderedTags: string[] = []
  const borderlessTag = tags.find(tag => tag === 'Borderless')
  
  // Add all non-Borderless tags first
  tags.forEach(tag => {
    if (tag !== 'Borderless') {
      reorderedTags.push(tag)
    }
  })
  
  // Add Borderless last if it exists
  if (borderlessTag) {
    reorderedTags.push(borderlessTag)
  }

  const unique = [...new Set(reorderedTags)]
  const suffix = unique.length ? " " + unique.map(t => `(${t})`).join(" ") : ""
  return { tags: unique, suffix }
}
