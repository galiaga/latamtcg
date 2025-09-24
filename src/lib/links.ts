export function getPrintingHref(printing: { id?: string } | { scryfallId?: string } | { printingId?: string } | { id: string }) {
  const pid = (printing as any).printingId || (printing as any).scryfallId || (printing as any).id
  return `/mtg/printing/${pid}`
}


