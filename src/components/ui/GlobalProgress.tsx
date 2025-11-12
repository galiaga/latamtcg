'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useLoading } from './LoadingProvider'
import NProgress from 'nprogress'

// Configure NProgress
NProgress.configure({
  showSpinner: false,
  speed: 500,
  minimum: 0.1,
  trickleSpeed: 200,
  trickleRate: 0.02,
})

/**
 * Global progress indicator that shows a slim top progress bar
 * during route transitions and long async actions.
 * 
 * Integrates with LoadingProvider to show progress for any loading state.
 * Also handles route changes via pathname changes.
 */
export default function GlobalProgress() {
  const { isLoading } = useLoading()
  const pathname = usePathname()

  // Handle route changes
  useEffect(() => {
    NProgress.start()
    
    // Complete progress bar after a short delay
    const timer = setTimeout(() => {
      NProgress.done()
    }, 100)

    return () => {
      clearTimeout(timer)
      NProgress.done()
    }
  }, [pathname])

  // Handle loading state from LoadingProvider
  useEffect(() => {
    if (isLoading) {
      NProgress.start()
    } else {
      NProgress.done()
    }
  }, [isLoading])

  return null
}

