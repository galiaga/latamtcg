'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import NProgress from 'nprogress'

// Configure NProgress
NProgress.configure({
  showSpinner: false,
  speed: 500,
  minimum: 0.1,
})

export default function ProgressBar() {
  const pathname = usePathname()

  useEffect(() => {
    // Start progress bar on route change
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

  return null
}
