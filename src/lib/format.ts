export function fmtCollector(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s.length ? s : null
}

export function formatUsd(value: unknown | null): string {
  if (value === null || value === undefined) return 'Not available'
  const num = Number(value)
  if (Number.isNaN(num)) return 'Not available'
  return `$${Math.ceil(num)}`
}

export function formatCLP(value: unknown | null): string {
  if (value === null || value === undefined) return 'Not available'
  const num = Number(value)
  if (Number.isNaN(num)) return 'Not available'
  return `$${num.toLocaleString("es-CL")}`
}


