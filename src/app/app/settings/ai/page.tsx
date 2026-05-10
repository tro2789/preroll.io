'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface AddonData {
  addon: { enabled: boolean; credits_balance: number; created_at?: string }
  selfHosted: boolean
}

interface CreditUsage {
  id: string
  credits_used: number
  balance_after: number
  reason: string
  created_at: string
}

interface CreditPurchase {
  id: string
  credits_purchased: number
  amount_cents: number
  created_at: string
}

const CREDIT_PACKS = [
  { id: 'starter', name: 'Starter', credits: 100, price: '$9' },
  { id: 'growth', name: 'Growth', credits: 500, price: '$39' },
  { id: 'scale', name: 'Scale', credits: 1000, price: '$69' },
]

export default function AiSettingsPage() {
  const searchParams = useSearchParams()
  const [addon, setAddon] = useState<AddonData | null>(null)
  const [usage, setUsage] = useState<CreditUsage[]>([])
  const [purchases, setPurchases] = useState<CreditPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [enabling, setEnabling] = useState(false)
  const [byokDeepgram, setByokDeepgram] = useState('')
  const [byokAnthropic, setByokAnthropic] = useState('')
  const [savingKeys, setSavingKeys] = useState(false)

  const purchaseStatus = searchParams.get('purchase')

  useEffect(() => {
    async function load() {
      try {
        const [addonRes, creditsRes] = await Promise.all([
          fetch('/api/v1/ai/addon'),
          fetch('/api/v1/ai/credits'),
        ])

        if (addonRes.ok) {
          const data = await addonRes.json()
          setAddon(data.data)
        }

        if (creditsRes.ok) {
          const data = await creditsRes.json()
          setUsage(data.data.usage || [])
          setPurchases(data.data.purchases || [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleEnable = async () => {
    setEnabling(true)
    try {
      const res = await fetch('/api/v1/ai/addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      })
      if (res.ok) {
        const data = await res.json()
        setAddon(prev => prev ? { ...prev, addon: data.data.addon } : prev)
      }
    } finally {
      setEnabling(false)
    }
  }

  const handlePurchase = async (pack: string) => {
    setPurchasing(pack)
    try {
      const res = await fetch('/api/stripe/ai-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack }),
      })
      const data = await res.json()
      if (data.data?.url) {
        window.location.href = data.data.url
      }
    } finally {
      setPurchasing(null)
    }
  }

  const handleSaveKeys = async () => {
    setSavingKeys(true)
    try {
      await fetch('/api/v1/ai/addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          deepgram_api_key: byokDeepgram || undefined,
          anthropic_api_key: byokAnthropic || undefined,
        }),
      })
    } finally {
      setSavingKeys(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-text-tertiary">Loading...</div>
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">AI Assistant</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Transcribe episodes and generate show notes, descriptions, and social copy from transcripts.
        </p>
      </div>

      {purchaseStatus === 'success' && (
        <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">
          Credits added successfully!
        </div>
      )}

      {/* Status Card */}
      <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-text-primary">Add-on Status</h3>
            <p className="mt-1 text-xs text-text-tertiary">
              {addon?.addon.enabled ? 'AI features are enabled for your workspace.' : 'Enable AI features to get started.'}
            </p>
          </div>
          {!addon?.addon.enabled ? (
            <button
              onClick={handleEnable}
              disabled={enabling}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {enabling ? 'Enabling...' : 'Enable'}
            </button>
          ) : (
            <span className="rounded-full bg-emerald-500/15 text-emerald-400 px-3 py-1 text-xs font-medium">
              Active
            </span>
          )}
        </div>
      </div>

      {addon?.addon.enabled && (
        <>
          {/* Credits */}
          {!addon.selfHosted && (
            <>
              <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-text-primary">Credit Balance</h3>
                    <p className="mt-1 text-2xl font-bold text-text-primary">
                      {addon.addon.credits_balance}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {CREDIT_PACKS.map((pack) => (
                    <button
                      key={pack.id}
                      onClick={() => handlePurchase(pack.id)}
                      disabled={purchasing !== null}
                      className="rounded-md border border-border-subtle bg-surface-default p-3 text-center hover:border-accent transition-colors disabled:opacity-50"
                    >
                      <div className="text-sm font-medium text-text-primary">{pack.credits} credits</div>
                      <div className="text-xs text-text-tertiary mt-1">{pack.price}</div>
                      {purchasing === pack.id && (
                        <div className="text-xs text-accent mt-1">Redirecting...</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Usage History */}
              {usage.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-3">Recent Usage</h3>
                  <div className="rounded-lg border border-border-subtle overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border-subtle bg-surface-raised">
                          <th className="px-3 py-2 text-left text-text-tertiary font-medium">Type</th>
                          <th className="px-3 py-2 text-right text-text-tertiary font-medium">Credits</th>
                          <th className="px-3 py-2 text-right text-text-tertiary font-medium">Balance</th>
                          <th className="px-3 py-2 text-right text-text-tertiary font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usage.map((u) => (
                          <tr key={u.id} className="border-b border-border-subtle last:border-0">
                            <td className="px-3 py-2 text-text-secondary capitalize">
                              {u.reason.replace(/_/g, ' ')}
                            </td>
                            <td className={`px-3 py-2 text-right tabular-nums ${u.credits_used > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {u.credits_used > 0 ? `-${u.credits_used}` : `+${Math.abs(u.credits_used)}`}
                            </td>
                            <td className="px-3 py-2 text-right text-text-tertiary tabular-nums">
                              {u.balance_after}
                            </td>
                            <td className="px-3 py-2 text-right text-text-tertiary">
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* BYOK Keys (self-hosted only) */}
          {addon.selfHosted && (
            <div className="rounded-lg border border-border-subtle bg-surface-raised p-5 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-text-primary">API Keys</h3>
                <p className="mt-1 text-xs text-text-tertiary">
                  Provide your own API keys for transcription and AI generation.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Deepgram API Key
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your Deepgram API key"
                    value={byokDeepgram}
                    onChange={(e) => setByokDeepgram(e.target.value)}
                    className="w-full rounded-md border border-border-subtle bg-surface-default px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Anthropic API Key
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your Anthropic API key"
                    value={byokAnthropic}
                    onChange={(e) => setByokAnthropic(e.target.value)}
                    className="w-full rounded-md border border-border-subtle bg-surface-default px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleSaveKeys}
                  disabled={savingKeys}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {savingKeys ? 'Saving...' : 'Save Keys'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
