export function printingHref(id: string): string {
  return `/mtg/printing/${id}`
}

export function printingPrettyHref(args: { set: string; collector: string; id: string }): string {
  const set = (args.set || '').toUpperCase()
  const collector = (args.collector ?? '').toString().trim()
  if (!collector) return printingHref(args.id)
  return `/mtg/printing/${set}/${encodeURIComponent(collector)}-${args.id}`
}

export function cardHref(cardSlug: string): string {
  return `/mtg/card/${encodeURIComponent(cardSlug)}`
}


