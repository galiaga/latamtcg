'use client'

import { useState, useEffect } from 'react'
import { PricingConfig, DailyShipping } from '@/lib/pricingData'
import { PurchasePolicy } from '@/lib/policy'
import { formatCLP } from '@/lib/format'

export default function AdminPricingPage() {
  const [token, setToken] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [policy, setPolicy] = useState<PurchasePolicy | null>(null)
  const [dailyShipping, setDailyShipping] = useState<DailyShipping[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [previewUsd, setPreviewUsd] = useState('10')
  const [showHelp, setShowHelp] = useState(false)

  // Form states
  const [formData, setFormData] = useState<Partial<PricingConfig>>({})
  const [policyForm, setPolicyForm] = useState<Partial<PurchasePolicy>>({})
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
      const [configRes, policyRes, shippingRes] = await Promise.all([
        fetch('/api/admin/pricing/config', { headers }),
        fetch('/api/admin/policy', { headers }),
        fetch('/api/admin/pricing/daily-shipping', { headers })
      ])

      if (!configRes.ok || !policyRes.ok || !shippingRes.ok) {
        throw new Error('Failed to load data')
      }

      const configData = await configRes.json()
      const policyData = await policyRes.json()
      const shippingData = await shippingRes.json()

      setConfig(configData)
      setFormData(configData)
      setPolicy(policyData)
      setPolicyForm(policyData)
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

  const savePolicy = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/policy', {
        method: 'POST',
        headers,
        body: JSON.stringify(policyForm)
      })

      if (!res.ok) {
        throw new Error('Failed to save policy')
      }

      const data = await res.json()
      setPolicy(data)
      setPolicyForm(data)
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

      {/* Help Section */}
      <div className="mb-6">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
        >
          <span>{showHelp ? '▼' : '▶'}</span>
          {showHelp ? 'Hide' : 'Show'} Parameter Documentation
        </button>
        
        {showHelp && (
          <div className="mt-4 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-900">Pricing Parameters Guide</h2>
            
            <div className="space-y-6">
              {/* Currency Settings */}
              <div>
                <h3 className="text-lg font-medium mb-2 text-blue-800">Currency Settings</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Use CLP:</strong> Enable/disable Chilean Peso pricing. When enabled, all prices are converted from USD to CLP using the pricing formula.
                  </div>
                  <div>
                    <strong>FX CLP:</strong> Exchange rate from USD to Chilean Pesos. This is the base conversion rate (e.g., 950 = 1 USD = 950 CLP).
                  </div>
                </div>
              </div>

              {/* Alpha Tiers */}
              <div>
                <h3 className="text-lg font-medium mb-2 text-blue-800">Alpha Tiers (Markup Multipliers)</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Alpha Tier Low USD:</strong> Price threshold for low-tier markup (default: 5). Cards under this price use Alpha Low.
                  </div>
                  <div>
                    <strong>Alpha Tier Mid USD:</strong> Price threshold for mid-tier markup (default: 20). Cards between Low and Mid use Alpha Mid.
                  </div>
                  <div>
                    <strong>Alpha Low:</strong> Markup multiplier for cards under Alpha Tier Low USD (default: 0.9 = 90% markup).
                  </div>
                  <div>
                    <strong>Alpha Mid:</strong> Markup multiplier for cards between Low and Mid tiers (default: 0.7 = 70% markup).
                  </div>
                  <div>
                    <strong>Alpha High:</strong> Markup multiplier for cards over Alpha Tier Mid USD (default: 0.5 = 50% markup).
                  </div>
                </div>
              </div>

              {/* Pricing Rules */}
              <div>
                <h3 className="text-lg font-medium mb-2 text-blue-800">Pricing Rules</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Price Min Per Card CLP:</strong> Minimum price for any single card in CLP (default: 500). No card will be priced below this amount.
                  </div>
                  <div>
                    <strong>Round To Step CLP:</strong> Rounding step for final prices (default: 500). All prices are rounded up to the nearest step.
                  </div>
                </div>
              </div>

              {/* Order Rules */}
              <div>
                <h3 className="text-lg font-medium mb-2 text-blue-800">Order Rules</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Min Order Subtotal CLP:</strong> Minimum order value before checkout (default: 10,000 CLP).
                  </div>
                  <div>
                    <strong>Shipping Flat CLP:</strong> Fixed shipping cost in CLP (default: 2,500 CLP).
                  </div>
                  <div>
                    <strong>Free Shipping Threshold CLP:</strong> Order value that qualifies for free shipping (default: 25,000 CLP). Leave empty to disable free shipping.
                  </div>
                </div>
              </div>

              {/* Purchase Limits */}
              <div>
                <h3 className="text-lg font-medium mb-2 text-blue-800">Purchase Limits</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Max Copies Per Item:</strong> Maximum copies a user can buy of the same card (default: 4).
                  </div>
                  <div>
                    <strong>Purchase Window Days:</strong> Rolling time window for limit enforcement (default: 3 days).
                  </div>
                </div>
              </div>

              {/* Pricing Formula */}
              <div>
                <h3 className="text-lg font-medium mb-2 text-blue-800">Pricing Formula</h3>
                <div className="bg-white p-4 rounded border text-sm font-mono">
                  <div>FinalPriceCLP = ceil_to_step(</div>
                  <div className="ml-4">max(priceMinPerCardClp,</div>
                  <div className="ml-8">(TCGPriceUSD × FX_CLP × (1 + alpha)) + betaClp),</div>
                  <div className="ml-4">roundToStepClp)</div>
                </div>
                <div className="mt-2 text-sm">
                  <strong>Where:</strong> alpha is determined by the card's USD price tier, and betaClp is calculated from daily shipping records.
                </div>
              </div>

              {/* Examples */}
              <div>
                <h3 className="text-lg font-medium mb-2 text-blue-800">Examples</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>$2 USD card:</strong> Uses Alpha Low (0.9), so markup = 90%. With FX 950: (2 × 950 × 1.9) = 3,610 CLP → rounded to 4,000 CLP.
                  </div>
                  <div>
                    <strong>$10 USD card:</strong> Uses Alpha Mid (0.7), so markup = 70%. With FX 950: (10 × 950 × 1.7) = 16,150 CLP → rounded to 16,500 CLP.
                  </div>
                  <div>
                    <strong>$50 USD card:</strong> Uses Alpha High (0.5), so markup = 50%. With FX 950: (50 × 950 × 1.5) = 71,250 CLP → rounded to 71,500 CLP.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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

      {/* Purchase Limits Policy */}
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Purchase Limits Policy</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Policy Overview */}
          <div className="space-y-4">
            <h3 className="font-medium">Current Policy</h3>
            {policy && (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded">
                <div>
                  <div className="text-sm text-gray-600">Max Copies per Item</div>
                  <div className="font-semibold">{policy.maxCopiesPerItem}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Purchase Window</div>
                  <div className="font-semibold">{policy.purchaseWindowDays} days</div>
                </div>
              </div>
            )}
          </div>

          {/* Policy Configuration */}
          <div className="space-y-4">
            <h3 className="font-medium">Update Policy</h3>
            <div className="p-4 border rounded space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Max Copies per Item</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={policyForm.maxCopiesPerItem || ''}
                  onChange={(e) => setPolicyForm({ ...policyForm, maxCopiesPerItem: parseInt(e.target.value) || 4 })}
                  className="w-full p-2 border rounded"
                />
                <div className="text-xs text-gray-600 mt-1">Maximum copies a user can buy of the same item</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purchase Window (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={policyForm.purchaseWindowDays || ''}
                  onChange={(e) => setPolicyForm({ ...policyForm, purchaseWindowDays: parseInt(e.target.value) || 3 })}
                  className="w-full p-2 border rounded"
                />
                <div className="text-xs text-gray-600 mt-1">Rolling time window for limit enforcement</div>
              </div>
              <button
                onClick={savePolicy}
                disabled={loading}
                className="w-full btn btn-primary"
              >
                {loading ? 'Saving...' : 'Save Policy'}
              </button>
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
