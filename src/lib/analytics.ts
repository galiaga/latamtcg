/**
 * Simple analytics tracking utility
 * Fires events as JSON logs (matches existing pattern in codebase)
 * Safe to use even if analytics not configured
 */
export function track(event: string, props?: Record<string, any>): void {
  try {
    console.log(JSON.stringify({ event, ...props, timestamp: Date.now() }))
  } catch {
    // Silently fail if logging fails
  }
}

