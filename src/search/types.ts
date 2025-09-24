export type SearchDoc = {
  id: string // printingId (Scryfall UUID)
  groupId: string // oracleId
  game: 'mtg'
  name: string
  setCode: string
  setName?: string | null
  collectorNumber: string
  finishLabel?: string | null
  variantLabel?: string | null
  lang: string
  imageThumbUrl?: string | null
  priceUsd?: number | null
}


