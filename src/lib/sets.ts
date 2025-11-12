import { prisma } from './prisma'
import { Prisma } from '@prisma/client'
import { RELEASE_CUTOFF } from './db/constants'

export async function getLatestSets(limit = 8) {
  // Only return sets that have at least one card
  // Exclude "Heroes of the Realm" sets
  return prisma.set.findMany({
    where: {
      released_at: {
        lte: RELEASE_CUTOFF,
        not: null,
      },
      cards: {
        some: {
          isPaper: true,
        },
      },
      set_name: {
        not: {
          contains: 'Heroes of the Realm',
        },
      },
    },
    select: {
      set_code: true,
      set_name: true,
      released_at: true,
    },
    orderBy: [{ released_at: 'desc' }],
    take: limit,
  })
}

export async function getAllSets() {
  // Only return sets that have at least one card
  // Exclude "Heroes of the Realm" sets
  return prisma.set.findMany({
    where: {
      released_at: {
        lte: RELEASE_CUTOFF,
        not: null,
      },
      cards: {
        some: {
          isPaper: true,
        },
      },
      set_name: {
        not: {
          contains: 'Heroes of the Realm',
        },
      },
    },
    select: {
      set_code: true,
      set_name: true,
      released_at: true,
      set_type: true,
    },
    orderBy: [{ released_at: 'desc' }],
  })
}

export async function getSetIconCard(setCode: string) {
  // Get the first card from the set to use as an icon
  // Only include cards from sets that are within the release window
  // Exclude "Heroes of the Realm" sets
  const card = await prisma.mtgCard.findFirst({
    where: {
      setCode: setCode,
      isPaper: true,
      set: {
        released_at: {
          lte: RELEASE_CUTOFF,
          not: null,
        },
        set_name: {
          not: {
            contains: 'Heroes of the Realm',
          },
        },
      },
    },
    select: {
      scryfallId: true,
    },
    orderBy: {
      collectorNumber: 'asc',
    },
  })
  return card?.scryfallId || null
}

export async function getAllSetsWithIcons() {
  // Fetch all sets and their icon cards in a single optimized query
  // Only include sets within the release window that have at least one card
  // Exclude "Heroes of the Realm" sets
  const sets = await prisma.set.findMany({
    where: {
      released_at: {
        lte: RELEASE_CUTOFF,
        not: null,
      },
      cards: {
        some: {
          isPaper: true,
        },
      },
      set_name: {
        not: {
          contains: 'Heroes of the Realm',
        },
      },
    },
    select: {
      set_code: true,
      set_name: true,
      released_at: true,
      set_type: true,
    },
    orderBy: [{ released_at: 'desc' }],
  })

  if (sets.length === 0) {
    return []
  }

  // Get icon cards for all sets in a single query using DISTINCT ON
  // This is much more efficient than N+1 queries
  // Filter by sets that are within the release window and have cards
  // Exclude "Heroes of the Realm" sets
  const setCodes = sets.map(s => s.set_code)
  const iconCards = await prisma.$queryRaw<Array<{ setCode: string; scryfallId: string }>>(
    Prisma.sql`
      SELECT DISTINCT ON (c."setCode") 
        c."setCode",
        c."scryfallId"
      FROM "MtgCard" c
      INNER JOIN "Set" s ON s.set_code = c."setCode"
      WHERE c."isPaper" = true
        AND c."setCode" = ANY(${setCodes})
        AND s.released_at IS NOT NULL
        AND s.released_at <= ${RELEASE_CUTOFF}
        AND lower(s.set_name) NOT LIKE ${'%heroes of the realm%'}
      ORDER BY c."setCode", c."collectorNumber" ASC
    `
  )

  // Create a map for quick lookup
  const iconMap = new Map(iconCards.map(ic => [ic.setCode, ic.scryfallId]))

  // Combine sets with their icon cards
  return sets.map(set => ({
    ...set,
    iconCardId: iconMap.get(set.set_code) || null,
  }))
}

