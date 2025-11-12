'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useLoading } from './useLoading'

/**
 * Hook that automatically manages loading state during route transitions.
 * Integrates with LoadingProvider to show progress during navigation.
 * 
 * This should be mounted once at the root level (e.g., in layout.tsx).
 * 
 * @example
 * ```tsx
 * // In layout.tsx
 * function RootLayout({ children }) {
 *   useRouteTransition()
 *   return <>{children}</>
 * }
 * ```
 */
export function useRouteTransition() {
  const pathname = usePathname()
  const { startLoading, stopLoading } = useLoading()

  useEffect(() => {
    // Start loading on route change
    startLoading()

    // Stop loading after a short delay (route change is usually fast)
    const timer = setTimeout(() => {
      stopLoading()
    }, 100)

    return () => {
      clearTimeout(timer)
      stopLoading()
    }
  }, [pathname, startLoading, stopLoading])
}

