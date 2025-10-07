"use client"

import { useEffect } from 'react'

export default function HydrationPerf() {
  useEffect(() => {
    try {
      performance.mark('mtg-search-hydrate-end')
      performance.measure('mtg-search-hydrate', 'mtg-search-hydrate-start', 'mtg-search-hydrate-end')
      const m = performance.getEntriesByName('mtg-search-hydrate').pop() as PerformanceMeasure | undefined
      const ms = m ? Math.round(m.duration) : 0
      // Structured log for client hydration
       
      console.log(JSON.stringify({ event: 'page.hydrate', route: '/mtg/search', ms }))
      performance.clearMarks('mtg-search-hydrate-start')
      performance.clearMarks('mtg-search-hydrate-end')
      performance.clearMeasures('mtg-search-hydrate')
    } catch {}
  }, [])
  return null
}


