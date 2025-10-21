'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Dot,
  Cell
} from 'recharts'
import { usePricing } from './PricingProvider'
import { getDisplayPrice, formatPrice } from '@/lib/pricingClient'

type PriceDataPoint = {
  date: string
  price: number
}

type PriceHistoryData = {
  normal: PriceDataPoint[]
  foil: PriceDataPoint[]
  etched: PriceDataPoint[]
}

type PriceHistoryResponse = {
  scryfallId: string
  days: number
  data: PriceHistoryData
  hasData: boolean
}

interface PriceHistoryChartProps {
  printingId: string
  days?: number
}

// Custom dot component for highlighting current price
const CustomDot = (props: any) => {
  const { cx, cy, payload, isCurrent } = props
  
  if (isCurrent) {
    return (
      <Dot
        cx={cx}
        cy={cy}
        r={6}
        fill="var(--primary)"
        stroke="white"
        strokeWidth={2}
        className="drop-shadow-sm"
      />
    )
  }
  
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={3}
      fill="currentColor"
      className="opacity-70 hover:opacity-100 transition-opacity"
    />
  )
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, config }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const normalPrice = data.normalPrice
    const foilPrice = data.foilPrice
    
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {new Date(label).toLocaleDateString()}
        </div>
        {normalPrice && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Normal: {config?.useCLP ? `$${Math.round(normalPrice).toLocaleString('es-CL')}` : `$${Math.round(normalPrice)}`}
          </div>
        )}
        {foilPrice && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Foil: {config?.useCLP ? `$${Math.round(foilPrice).toLocaleString('es-CL')}` : `$${Math.round(foilPrice)}`}
          </div>
        )}
      </div>
    )
  }
  return null
}

// Format CLP values for Y-axis (no decimals) - value is already in CLP
const formatCLP = (value: number, config: any) => {
  if (!value || value === 0) return '$0'
  
  // Format without decimals - value is already converted to CLP
  if (config?.useCLP) {
    return `$${Math.round(value).toLocaleString('es-CL')}`
  }
  return `$${Math.round(value)}`
}

// Format relative dates for X-axis
const formatRelativeDate = (date: string) => {
  const dateObj = new Date(date)
  const today = new Date()
  const diffTime = today.getTime() - dateObj.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1d ago'
  return `${diffDays}d ago`
}

// Calculate trend color based on price change (using CLP prices)
const getTrendColor = (data: PriceDataPoint[], finish: string, config: any) => {
  if (data.length < 2) return '#8b5cf6' // Neutral purple
  
  // Data is already converted to CLP, so use it directly
  const firstPrice = data[0].price
  const lastPrice = data[data.length - 1].price
  
  if (!firstPrice || !lastPrice) return '#8b5cf6'
  
  const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100
  
  if (Math.abs(changePercent) < 2) return '#8b5cf6' // Stable - purple
  if (changePercent > 0) return '#10b981' // Up - green
  return '#ef4444' // Down - red
}

// Calculate trend summary (using CLP prices)
const getTrendSummary = (data: PriceDataPoint[], finish: string, config: any) => {
  if (data.length < 2) return { trend: 'stable', change: 0, min: 0, max: 0 }
  
  // Data is already converted to CLP, so use it directly
  const clpPrices = data.map(point => point.price).filter(price => price !== null) as number[]
  
  if (clpPrices.length < 2) return { trend: 'stable', change: 0, min: 0, max: 0 }
  
  const firstPrice = clpPrices[0]
  const lastPrice = clpPrices[clpPrices.length - 1]
  const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100
  
  const min = Math.min(...clpPrices)
  const max = Math.max(...clpPrices)
  
  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (Math.abs(changePercent) >= 2) {
    trend = changePercent > 0 ? 'up' : 'down'
  }
  
  return { trend, change: changePercent, min, max }
}

export default function PriceHistoryChart({ printingId, days = 30 }: PriceHistoryChartProps) {
  const [data, setData] = useState<PriceHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { config } = usePricing()

  useEffect(() => {
    async function fetchPriceHistory() {
      try {
        setLoading(true)
        const response = await fetch(`/api/mtg/printing/${printingId}/price-history?days=${days}`)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const result: PriceHistoryResponse = await response.json()
        
        if (!result.hasData) {
          setData(null)
        } else {
          setData(result.data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch price history')
      } finally {
        setLoading(false)
      }
    }

    fetchPriceHistory()
  }, [printingId, days])

  if (loading) {
    return (
      <div className="card p-2 lg:p-3">
        <h3 className="text-sm lg:text-base font-semibold mb-2 lg:mb-3">Price History ({days} days)</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-sm" style={{ color: 'var(--mutedText)' }}>
            Loading price history...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-2 lg:p-3">
        <h3 className="text-sm lg:text-base font-semibold mb-2 lg:mb-3">Price History ({days} days)</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-sm text-red-500">
            Error: {error}
          </div>
        </div>
      </div>
    )
  }

  if (!data || (!data.normal.length && !data.foil.length && !data.etched.length)) {
    return (
      <div className="card p-2 lg:p-3">
        <h3 className="text-sm lg:text-base font-semibold mb-2 lg:mb-3">Price History ({days} days)</h3>
        <div className="h-64 flex flex-col items-center justify-center text-sm" style={{ color: 'var(--mutedText)' }}>
          <div className="text-4xl mb-2">📊</div>
          <p className="text-center">No price history available yet</p>
          <p className="text-center text-xs mt-1">Check back soon once we gather more data</p>
        </div>
      </div>
    )
  }

  // Determine which finish types to display
  const hasNormal = data.normal.length > 0
  const hasFoil = data.foil.length > 0
  
  // Prepare chart data for both normal and foil prices
  const normalChartData = hasNormal ? data.normal.map((point, index) => {
    const card = { 
      priceUsd: point.price,
      priceUsdFoil: null,
      priceUsdEtched: null,
      computedPriceClp: null
    }
    const clpPrice = getDisplayPrice(card, config, ['normal'])
    return {
      ...point,
      normalPrice: clpPrice || point.price,
      foilPrice: null,
      isCurrent: index === data.normal.length - 1
    }
  }) : []

  const foilChartData = hasFoil ? data.foil.map((point, index) => {
    const card = { 
      priceUsd: null,
      priceUsdFoil: point.price,
      priceUsdEtched: null,
      computedPriceClp: null
    }
    const clpPrice = getDisplayPrice(card, config, ['foil'])
    return {
      ...point,
      normalPrice: null,
      foilPrice: clpPrice || point.price,
      isCurrent: index === data.foil.length - 1
    }
  }) : []

  // Combine data points by date
  const allDates = new Set([...data.normal.map(p => p.date), ...data.foil.map(p => p.date)])
  const chartData = Array.from(allDates).map(date => {
    const normalPoint = data.normal.find(p => p.date === date)
    const foilPoint = data.foil.find(p => p.date === date)
    
    const normalCard = normalPoint ? { 
      priceUsd: normalPoint.price,
      priceUsdFoil: null,
      priceUsdEtched: null,
      computedPriceClp: null
    } : null
    
    const foilCard = foilPoint ? { 
      priceUsd: null,
      priceUsdFoil: foilPoint.price,
      priceUsdEtched: null,
      computedPriceClp: null
    } : null
    
    return {
      date,
      normalPrice: normalCard ? getDisplayPrice(normalCard, config, ['normal']) : null,
      foilPrice: foilCard ? getDisplayPrice(foilCard, config, ['foil']) : null,
      isCurrent: date === Array.from(allDates).sort().pop()
    }
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Calculate trend for both normal and foil prices
  const normalTrendSummary = hasNormal ? getTrendSummary(
    data.normal.map((point, index) => ({
      ...point,
      price: getDisplayPrice({ priceUsd: point.price, priceUsdFoil: null, priceUsdEtched: null, computedPriceClp: null }, config, ['normal']) || point.price,
      isCurrent: index === data.normal.length - 1
    })), 'normal', config
  ) : null

  const foilTrendSummary = hasFoil ? getTrendSummary(
    data.foil.map((point, index) => ({
      ...point,
      price: getDisplayPrice({ priceUsd: null, priceUsdFoil: point.price, priceUsdEtched: null, computedPriceClp: null }, config, ['foil']) || point.price,
      isCurrent: index === data.foil.length - 1
    })), 'foil', config
  ) : null
  
  // Calculate Y-axis domain with 10% padding (using CLP prices from both lines)
  const allPrices = [...chartData.map(d => d.normalPrice), ...chartData.map(d => d.foilPrice)].filter(p => p !== null) as number[]
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const padding = (maxPrice - minPrice) * 0.1
  const yDomain = [Math.max(0, minPrice - padding), maxPrice + padding]

  return (
    <div className="card p-2 lg:p-3">
      <h3 className="text-sm lg:text-base font-semibold mb-2 lg:mb-3">Price History ({days} days)</h3>
      
      {/* Trend Summary */}
      <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--cardSoft)' }}>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">30-Day Trend:</span>
            {normalTrendSummary && (
              <span 
                className={`flex items-center gap-1 font-semibold ${
                  normalTrendSummary.trend === 'up' ? 'text-green-600' : 
                  normalTrendSummary.trend === 'down' ? 'text-red-600' : 
                  'text-purple-600'
                }`}
              >
                <span className="text-blue-600">●</span>
                {normalTrendSummary.trend === 'up' ? '▲' : normalTrendSummary.trend === 'down' ? '▼' : '●'}
                {Math.abs(normalTrendSummary.change).toFixed(1)}%
                <span className="text-xs">Normal</span>
              </span>
            )}
            {foilTrendSummary && (
              <span 
                className={`flex items-center gap-1 font-semibold ${
                  foilTrendSummary.trend === 'up' ? 'text-green-600' : 
                  foilTrendSummary.trend === 'down' ? 'text-red-600' : 
                  'text-purple-600'
                }`}
              >
                <span className="text-amber-600">●</span>
                {foilTrendSummary.trend === 'up' ? '▲' : foilTrendSummary.trend === 'down' ? '▼' : '●'}
                {Math.abs(foilTrendSummary.change).toFixed(1)}%
                <span className="text-xs">Foil</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full" style={{ height: '211px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            aria-label="30-day price history chart"
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--border)" 
              opacity={0.1} 
            />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatRelativeDate}
              tick={{ fontSize: 12, fill: 'var(--mutedText)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
            />
            <YAxis 
              tickFormatter={(value) => formatCLP(value, config)}
              domain={yDomain}
              tick={{ fontSize: 12, fill: 'var(--mutedText)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
            />
            <Tooltip content={(props) => <CustomTooltip {...props} config={config} />} />
            {hasNormal && (
              <Line
                type="monotone"
                dataKey="normalPrice"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={(props: any) => {
                  const { key, ...restProps } = props
                  return <CustomDot key={key} {...restProps} isCurrent={props.payload.isCurrent} />
                }}
                activeDot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2 }}
                animationDuration={1000}
                animationEasing="ease-out"
                connectNulls={false}
              />
            )}
            {hasFoil && (
              <Line
                type="monotone"
                dataKey="foilPrice"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={(props: any) => {
                  const { key, ...restProps } = props
                  return <CustomDot key={key} {...restProps} isCurrent={props.payload.isCurrent} />
                }}
                activeDot={{ r: 4, stroke: '#f59e0b', strokeWidth: 2 }}
                animationDuration={1000}
                animationEasing="ease-out"
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}