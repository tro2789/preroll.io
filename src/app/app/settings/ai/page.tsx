'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface AddonData {
  addon: {
    enabled: boolean
    credits_balance: number
    monthly_allowance: number
    monthly_used: number
    monthly_remaining: number
    cycle_reset_at: string | null
  }
  selfHosted: boolean
}

interface CreditUsage {
  id: string
  credits_used: number
  balance_after: number
  reason: string
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
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
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
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
          deepgram_api_key: byokDeepgram || undefined,
          anthropic_api_key: byokAnthropic || undefined,
        }),
      })
    } finally {
      setSavingKeys(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading...</div>
  }

  const a = addon?.addon

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">AI Usage</h2>
      </div>

      {purchaseStatus === 'success' && (
        <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">
          Credits added successfully!
        </div>
      )}

      {!a?.enabled && (
        <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
          <h3 className="text-sm font-medium text-text-primary">AI Not Available</h3>
          <p className="mt-1 text-xs text-text-secondary">
            AI features are included with Pro and Studio plans. Upgrade to get monthly AI credits for transcription and content generation.
          </p>
          <a
            href="/app/settings/billing"
            className="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            Upgrade Plan
          </a>
        </div>
      )}

      {a?.enabled && !addon?.selfHosted && (
        <>

          <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-text-primary">Monthly Allowance</h3>
              {a.cycle_reset_at && (
                <span className="text-xs text-text-secondary">
                  Resets {new Date(a.cycle_reset_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-text-primary tabular-nums">
                  {a.monthly_used}
                  <span className="text-sm font-normal text-text-secondary"> / {a.monthly_allowance}</span>
                </span>
                <span className="text-xs text-text-secondary">
                  {a.monthly_remaining} remaining
                </span>
              </div>

              <div className="h-2 rounded-full bg-surface-default overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    a.monthly_remaining === 0
                      ? 'bg-red-400'
                      : a.monthly_allowance > 0 && a.monthly_used / a.monthly_allowance > 0.8
                      ? 'bg-amber-400'
                      : 'bg-accent'
                  }`}
                  style={{ width: `${Math.min(100, (a.monthly_used / Math.max(1, a.monthly_allowance)) * 100)}%` }}
                />
              </div>
            </div>
          </div>


          <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-text-primary">Purchased Credits</h3>
                <p className="mt-1 text-xs text-text-secondary">
                  Used after your monthly allowance is exhausted.
                </p>
              </div>
              <span className="text-2xl font-bold text-text-primary tabular-nums">
                {a.credits_balance}
              </span>
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
                  <div className="text-xs text-text-secondary mt-1">{pack.price}</div>
                  {purchasing === pack.id && (
                    <div className="text-xs text-accent mt-1">Redirecting...</div>
                  )}
                </button>
              ))}
            </div>
          </div>


          {usage.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-3">Recent Usage</h3>
              <div className="rounded-lg border border-border-subtle overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle bg-surface-raised">
                      <th className="px-3 py-2 text-left text-text-secondary font-medium">Type</th>
                      <th className="px-3 py-2 text-right text-text-secondary font-medium">Credits</th>
                      <th className="px-3 py-2 text-right text-text-secondary font-medium">Balance</th>
                      <th className="px-3 py-2 text-right text-text-secondary font-medium">Date</th>
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
                        <td className="px-3 py-2 text-right text-text-secondary tabular-nums">
                          {u.balance_after}
                        </td>
                        <td className="px-3 py-2 text-right text-text-secondary">
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


      {addon?.selfHosted && (
        <div className="rounded-lg border border-border-subtle bg-surface-raised p-5 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-text-primary">API Keys</h3>
            <p className="mt-1 text-xs text-text-secondary">
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
    </div>
  )
}
