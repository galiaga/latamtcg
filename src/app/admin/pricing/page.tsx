'use client'

import { useState, useEffect } from 'react'
import { PricingConfig, DailyShipping } from '@/lib/pricingData'
import { formatCLP } from '@/lib/format'

export default function AdminPricingPage() {
  const [token, setToken] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [dailyShipping, setDailyShipping] = useState<DailyShipping[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [previewUsd, setPreviewUsd] = useState('10')

  // Form states
  const [formData, setFormData] = useState<Partial<PricingConfig>>({})
  const [shippingForm, setShippingForm] = useState({
    date: new Date().toISOString().split('T')[0],
    totalShippingUsd: '',
    cardsCount: '',
    notes: ''
  })

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-token': token
  }

  const authenticate = () => {
    if (token.trim()) {
      setAuthenticated(true)
      loadData()
    }
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [configRes, shippingRes] = await Promise.all([
        fetch('/api/admin/pricing/config', { headers }),
        fetch('/api/admin/pricing/daily-shipping', { headers })
      ])

      if (!configRes.ok || !shippingRes.ok) {
        throw new Error('Failed to load data')
      }

      const configData = await configRes.json()
      const shippingData = await shippingRes.json()

      setConfig(configData)
      setFormData(configData)
      setDailyShipping(shippingData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/pricing/config', {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        throw new Error('Failed to save configuration')
      }

      const data = await res.json()
      setConfig(data)
      setFormData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const saveDailyShipping = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/pricing/daily-shipping', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...shippingForm,
          date: new Date(shippingForm.date),
          totalShippingUsd: parseFloat(shippingForm.totalShippingUsd),
          cardsCount: parseInt(shippingForm.cardsCount)
        })
      })

      if (!res.ok) {
        throw new Error('Failed to save daily shipping')
      }

      await loadData()
      setShippingForm({
        date: new Date().toISOString().split('T')[0],
        totalShippingUsd: '',
        cardsCount: '',
        notes: ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const previewPricing = async () => {
    try {
      const res = await fetch(`/api/pricing/preview?tcgUsd=${previewUsd}`)
      if (res.ok) {
        const data = await res.json()
        setPreviewData(data)
      }
    } catch (err) {
      console.error('Preview failed:', err)
    }
  }

  const repriceAll = async () => {
    if (!confirm('This will recalculate prices for all cards. Continue?')) return
    
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/reprice', {
        method: 'POST',
        headers
      })

      if (!res.ok) {
        throw new Error('Failed to reprice cards')
      }

      const data = await res.json()
      alert(`Repricing completed: ${data.processed}/${data.total} cards processed`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 border rounded">
        <h1 className="text-2xl font-bold mb-4">Admin Access</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Admin Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter admin token"
            />
          </div>
          <button
            onClick={authenticate}
            className="w-full btn btn-primary"
            disabled={!token.trim()}
          >
            Authenticate
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pricing Administration</h1>
        <button
          onClick={() => setAuthenticated(false)}
          className="btn btn-ghost"
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overview */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Overview</h2>
          {config && (
            <div className="grid grid-cols-2 gap-4 p-4 border rounded">
              <div>
                <div className="text-sm text-gray-600">Today's FX</div>
                <div className="font-semibold">{config.fxClp} CLP/USD</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">CLP Toggle</div>
                <div className="font-semibold">{config.useCLP ? 'Enabled' : 'Disabled'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Min per Card</div>
                <div className="font-semibold">{formatCLP(config.priceMinPerCardClp)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Round Step</div>
                <div className="font-semibold">{formatCLP(config.roundToStepClp)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Order Minimum</div>
                <div className="font-semibold">{formatCLP(config.minOrderSubtotalClp)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Shipping Flat</div>
                <div className="font-semibold">{formatCLP(config.shippingFlatClp)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Free Shipping</div>
                <div className="font-semibold">
                  {config.freeShippingThresholdClp ? formatCLP(config.freeShippingThresholdClp) : 'Disabled'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Configuration Form */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Configuration</h2>
          <div className="p-4 border rounded space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useCLP"
                checked={formData.useCLP || false}
                onChange={(e) => setFormData({ ...formData, useCLP: e.target.checked })}
              />
              <label htmlFor="useCLP">Use CLP pricing</label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">FX Rate (CLP per USD)</label>
              <input
                type="number"
                step="0.01"
                value={formData.fxClp || ''}
                onChange={(e) => setFormData({ ...formData, fxClp: parseFloat(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Low Tier (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.alphaTierLowUsd || ''}
                  onChange={(e) => setFormData({ ...formData, alphaTierLowUsd: parseFloat(e.target.value) })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mid Tier (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.alphaTierMidUsd || ''}
                  onChange={(e) => setFormData({ ...formData, alphaTierMidUsd: parseFloat(e.target.value) })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Alpha Low</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.alphaLow || ''}
                  onChange={(e) => setFormData({ ...formData, alphaLow: parseFloat(e.target.value) })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Alpha Mid</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.alphaMid || ''}
                  onChange={(e) => setFormData({ ...formData, alphaMid: parseFloat(e.target.value) })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Alpha High</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.alphaHigh || ''}
                  onChange={(e) => setFormData({ ...formData, alphaHigh: parseFloat(e.target.value) })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Min per Card (CLP)</label>
                <input
                  type="number"
                  value={formData.priceMinPerCardClp || ''}
                  onChange={(e) => setFormData({ ...formData, priceMinPerCardClp: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Round Step (CLP)</label>
                <input
                  type="number"
                  value={formData.roundToStepClp || ''}
                  onChange={(e) => setFormData({ ...formData, roundToStepClp: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Order Minimum (CLP)</label>
                <input
                  type="number"
                  value={formData.minOrderSubtotalClp || ''}
                  onChange={(e) => setFormData({ ...formData, minOrderSubtotalClp: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Shipping Flat (CLP)</label>
                <input
                  type="number"
                  value={formData.shippingFlatClp || ''}
                  onChange={(e) => setFormData({ ...formData, shippingFlatClp: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Free Shipping Threshold (CLP)</label>
              <input
                type="number"
                value={formData.freeShippingThresholdClp || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  freeShippingThresholdClp: e.target.value ? parseInt(e.target.value) : null 
                })}
                className="w-full p-2 border rounded"
                placeholder="Leave empty to disable"
              />
            </div>

            <button
              onClick={saveConfig}
              disabled={loading}
              className="w-full btn btn-primary"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>

      {/* Daily Shipping */}
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Daily Shipping</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-4 border rounded space-y-4">
            <h3 className="font-medium">Add/Update Daily Shipping</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={shippingForm.date}
                onChange={(e) => setShippingForm({ ...shippingForm, date: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total Shipping (USD)</label>
              <input
                type="number"
                step="0.01"
                value={shippingForm.totalShippingUsd}
                onChange={(e) => setShippingForm({ ...shippingForm, totalShippingUsd: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cards Count</label>
              <input
                type="number"
                value={shippingForm.cardsCount}
                onChange={(e) => setShippingForm({ ...shippingForm, cardsCount: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={shippingForm.notes}
                onChange={(e) => setShippingForm({ ...shippingForm, notes: e.target.value })}
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>
            <button
              onClick={saveDailyShipping}
              disabled={loading}
              className="w-full btn btn-primary"
            >
              {loading ? 'Saving...' : 'Save Daily Shipping'}
            </button>
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-medium mb-4">Recent Records</h3>
            <div className="space-y-2">
              {dailyShipping.map((record) => (
                <div key={record.id} className="text-sm p-2 bg-gray-50 rounded">
                  <div className="font-medium">{record.date.toLocaleDateString()}</div>
                  <div>Shipping: ${record.totalShippingUsd} | Cards: {record.cardsCount}</div>
                  <div>Beta CLP: {formatCLP((record.totalShippingUsd / Math.max(record.cardsCount, 1)) * (config?.fxClp || 1))}</div>
                  {record.notes && <div className="text-gray-600">{record.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Preview */}
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Pricing Preview</h2>
        <div className="p-4 border rounded space-y-4">
          <div className="flex gap-4">
            <input
              type="number"
              step="0.01"
              value={previewUsd}
              onChange={(e) => setPreviewUsd(e.target.value)}
              className="p-2 border rounded"
              placeholder="TCG USD Price"
            />
            <button onClick={previewPricing} className="btn btn-primary">
              Preview
            </button>
            <button onClick={repriceAll} disabled={loading} className="btn btn-secondary">
              {loading ? 'Processing...' : 'Reprice All Cards'}
            </button>
          </div>

          {previewData && (
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-medium mb-2">Pricing Breakdown</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Final CLP: <span className="font-semibold">{formatCLP(previewData.finalClp)}</span></div>
                <div>Alpha Used: <span className="font-semibold">{previewData.alphaUsed}</span></div>
                <div>Beta CLP: <span className="font-semibold">{formatCLP(previewData.betaClp)}</span></div>
                <div>FX Rate: <span className="font-semibold">{previewData.fxClp}</span></div>
                <div>Base CLP: <span className="font-semibold">{formatCLP(previewData.baseClp)}</span></div>
                <div>Pre-Floor: <span className="font-semibold">{formatCLP(previewData.preFloor)}</span></div>
                <div>Min per Card: <span className="font-semibold">{formatCLP(previewData.minPerCard)}</span></div>
                <div>Step: <span className="font-semibold">{formatCLP(previewData.step)}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
