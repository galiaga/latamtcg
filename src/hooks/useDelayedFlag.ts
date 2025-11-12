import { useState, useEffect } from 'react'

/**
 * Hook that returns true only after the specified delay (in milliseconds).
 * Useful for showing skeletons only if loading takes longer than a threshold
 * to avoid flicker on fast loads, while still guaranteeing feedback by the delay time.
 *
 * @param delayMs - Delay in milliseconds before flag becomes true (default: 150)
 * @param condition - Optional condition that must be true for the delay to start
 * @returns boolean indicating if the delay has elapsed
 *
 * @example
 * const isLoading = useQuery().isLoading
 * const showSkeleton = useDelayedFlag(150, isLoading)
 * // showSkeleton will be true only if isLoading is true AND 150ms have passed
 */
export function useDelayedFlag(delayMs: number = 150, condition: boolean = true): boolean {
  const [delayed, setDelayed] = useState(false)

  useEffect(() => {
    if (!condition) {
      setDelayed(false)
      return
    }

    const timer = setTimeout(() => {
      setDelayed(true)
    }, delayMs)

    return () => {
      clearTimeout(timer)
    }
  }, [condition, delayMs])

  return delayed
}

