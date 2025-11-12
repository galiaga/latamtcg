'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface LoadingContextValue {
  loadingCount: number
  startLoading: () => void
  stopLoading: () => void
  withLoading: <T>(promise: Promise<T>) => Promise<T>
  isLoading: boolean
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loadingCount, setLoadingCount] = useState(0)

  const startLoading = useCallback(() => {
    setLoadingCount((prev) => prev + 1)
  }, [])

  const stopLoading = useCallback(() => {
    setLoadingCount((prev) => Math.max(0, prev - 1))
  }, [])

  const withLoading = useCallback(
    async <T,>(promise: Promise<T>): Promise<T> => {
      startLoading()
      try {
        const result = await promise
        return result
      } finally {
        stopLoading()
      }
    },
    [startLoading, stopLoading]
  )

  const isLoading = loadingCount > 0

  return (
    <LoadingContext.Provider
      value={{
        loadingCount,
        startLoading,
        stopLoading,
        withLoading,
        isLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}

