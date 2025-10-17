'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { PricingConfig } from '@/lib/pricingData'

interface PricingContextType {
  config: PricingConfig | null
  isLoading: boolean
  error: string | null
  refreshConfig: () => Promise<void>
}

const PricingContext = createContext<PricingContextType | undefined>(undefined)

export function PricingProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/pricing/config')
      if (!response.ok) {
        throw new Error('Failed to fetch pricing config')
      }
      const data = await response.json()
      setConfig(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Failed to fetch pricing config:', err)
      
      // Fallback to default configuration if API fails
      const defaultConfig = {
        id: 'default',
        useCLP: true,
        fxClp: 950,
        alphaTierLowUsd: 5,
        alphaTierMidUsd: 20,
        alphaLow: 0.9,
        alphaMid: 0.7,
        alphaHigh: 0.5,
        priceMinPerCardClp: 500,
        roundToStepClp: 500,
        minOrderSubtotalClp: 10000,
        shippingFlatClp: 2500,
        freeShippingThresholdClp: 25000,
        updatedAt: new Date(),
        createdAt: new Date()
      }
      setConfig(defaultConfig)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  return (
    <PricingContext.Provider value={{ config, isLoading, error, refreshConfig: fetchConfig }}>
      {children}
    </PricingContext.Provider>
  )
}

export function usePricing() {
  const context = useContext(PricingContext)
  if (context === undefined) {
    throw new Error('usePricing must be used within a PricingProvider')
  }
  return context
}
