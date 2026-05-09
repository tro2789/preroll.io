'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface OrgBilling {
  plan_id: string
  plan_status: string
  subscription?: {
    status: string
    current_period_end: string
    cancel_at_period_end: boolean
  }
  trial?: {
    active: boolean
    days_left: number
    ends_at: string
  }
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  studio: 'Studio',
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: ['1 client, 1 show', 'Episode pipeline', 'Client portal', 'Calendar view'],
  pro: [
    'Unlimited clients and shows',
    'All integrations',
    'Webhooks and API keys',
    'MCP server',
    'Episode templates',
  ],
  studio: [
    'Everything in Pro',
    'Multi-user access',
    'White-label portal',
    'Reporting',
    'Priority support',
  ],
}

export default function BillingPage() {
  const [billing, setBilling] = useState<OrgBilling | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    fetch('/api/v1/billing')
      .then((r) => r.json())
      .then((r) => setBilling(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleUpgrade(plan: string, interval: 'month' | 'year' = 'month') {
    setUpgrading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      })
      const { data } = await res.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        setUpgrading(null)
      }
    } catch {
      setUpgrading(null)
    }
  }

  async function handleManage() {
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const { data } = await res.json()
      if (data?.url) window.location.href = data.url
    } catch {}
  }

  if (loading) {
    return <div className="text-sm text-text-tertiary">Loading billing...</div>
  }

  const currentPlan = billing?.plan_id || 'free'
  const isPaid = currentPlan !== 'free'
  const isCanceling = billing?.subscription?.cancel_at_period_end
  const trial = billing?.trial

  return (
    <div className="space-y-8">
      {success && (
        <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          Your subscription is now active.
        </div>
      )}
      {canceled && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          Checkout was canceled. No changes were made.
        </div>
      )}

      {trial?.active && !isPaid && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-accent">
                Studio Trial — {trial.days_left} {trial.days_left === 1 ? 'day' : 'days'} left
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                You have full access to all Studio features. Upgrade before your trial ends to keep them.
              </p>
            </div>
          </div>
        </div>
      )}

      {trial && !trial.active && !isPaid && (
        <div className="rounded-xl border border-border-default bg-surface-raised p-5">
          <p className="text-sm text-text-secondary">
            Your free trial has ended. Upgrade to continue using Pro and Studio features.
          </p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-text-primary">Current Plan</h2>
        <div className="mt-3 rounded-xl border border-border-default bg-surface-raised p-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-text-primary">
                {PLAN_LABELS[currentPlan] || currentPlan}
              </span>
              {billing?.plan_status && billing.plan_status !== 'active' && (
                <span className="ml-2 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
                  {billing.plan_status}
                </span>
              )}
              {isCanceling && (
                <span className="ml-2 rounded-full bg-error/10 px-2.5 py-0.5 text-xs font-medium text-error">
                  Cancels at period end
                </span>
              )}
            </div>
            {isPaid && (
              <button
                onClick={handleManage}
                className="rounded-lg border border-border-default bg-surface-overlay px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-input transition-colors"
              >
                Manage Subscription
              </button>
            )}
          </div>
          {billing?.subscription?.current_period_end && (
            <p className="mt-2 text-sm text-text-tertiary">
              Current period ends {new Date(billing.subscription.current_period_end).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {!isPaid && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Upgrade</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {(['pro', 'studio'] as const).map((plan) => (
              <div
                key={plan}
                className={`rounded-xl border p-6 ${
                  plan === 'pro'
                    ? 'border-accent bg-surface-raised ring-1 ring-accent/20'
                    : 'border-border-default bg-surface-raised'
                }`}
              >
                <h3 className="text-lg font-semibold text-text-primary">
                  {PLAN_LABELS[plan]}
                </h3>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-text-primary">
                    ${plan === 'pro' ? '29' : '79'}
                  </span>
                  <span className="text-sm text-text-tertiary">/mo</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {PLAN_FEATURES[plan].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                      <svg className="h-4 w-4 mt-0.5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => handleUpgrade(plan, 'month')}
                    disabled={!!upgrading}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                      plan === 'pro'
                        ? 'bg-accent text-white hover:bg-accent-hover'
                        : 'bg-surface-overlay text-text-primary hover:bg-surface-input border border-border-default'
                    }`}
                  >
                    {upgrading === plan ? 'Redirecting...' : 'Monthly'}
                  </button>
                  <button
                    onClick={() => handleUpgrade(plan, 'year')}
                    disabled={!!upgrading}
                    className="flex-1 rounded-lg border border-border-default bg-surface-overlay py-2.5 text-sm font-medium text-text-primary hover:bg-surface-input transition-colors disabled:opacity-50"
                  >
                    Annual (save 17%)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
