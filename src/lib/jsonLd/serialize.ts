/** Safe for embedding in <script type="application/ld+json"> */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
