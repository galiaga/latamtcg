/**
 * Convert a card name to a URL-safe slug.
 * 
 * Rules:
 * - Lowercase
 * - Spaces replaced with hyphens
 * - Special characters removed
 * - Stable and deterministic
 * 
 * This matches the format expected by /mtg/card/[cardSlug]:
 * - The slug is used directly (Next.js handles URL encoding)
 * - The page decodes it with: decodeURIComponent(cardSlug).replace(/-/g, ' ')
 * 
 * Examples:
 * - "Lightning Bolt" -> "lightning-bolt"
 * - "Jace, the Mind Sculptor" -> "jace-the-mind-sculptor"
 * - "Sol'kanar the Swamp King" -> "solkanar-the-swamp-king"
 */
export function cardNameToSlug(cardName: string): string {
  return cardName
    .toLowerCase()
    .trim()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove special characters (keep only alphanumeric and hyphens)
    .replace(/[^\w-]/g, '')
    // Collapse multiple hyphens into one
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
}

/**
 * Get the canonical card slug for a given oracleId.
 * Looks up the card name from the database and converts it to a slug.
 * 
 * @param oracleId - The Scryfall oracle ID
 * @returns The card slug, or null if card not found
 */
export async function getCardSlugFromOracleId(oracleId: string): Promise<string | null> {
  const { prisma } = await import('@/lib/prisma')
  
  const card = await prisma.mtgCard.findFirst({
    where: {
      oracleId,
      isPaper: true,
      lang: 'en',
    },
    select: {
      name: true,
    },
    orderBy: {
      releasedAt: 'desc', // Prefer newer cards if multiple exist
    },
  })
  
  if (!card?.name) {
    return null
  }
  
  return cardNameToSlug(card.name)
}
