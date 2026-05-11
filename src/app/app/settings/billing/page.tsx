'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PLAN_LABELS } from '@/lib/constants/plans'

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
  self_hosted?: boolean
}

interface LicenseInfo {
  email: string
  orgName: string
  issuedAt: string
}

interface LicenseStatus {
  self_hosted: boolean
  registered: boolean
  info: LicenseInfo | null
}

const UPGRADE_TIERS = [
  {
    plan: 'pro' as const,
    name: 'Pro',
    description: 'For producers managing multiple shows.',
    monthly: 29,
    annual: 289,
    features: [
      'Unlimited clients and shows',
      'All integrations (Frame.io, Transistor, Drive, Vimeo)',
      'Webhook egress and API keys',
      'MCP server access',
      'Episode templates',
    ],
    highlighted: true,
  },
  {
    plan: 'studio' as const,
    name: 'Studio',
    description: 'For teams and agencies.',
    monthly: 79,
    annual: 789,
    features: [
      'Everything in Pro',
      'Multi-user access with roles',
      'White-label client portal',
      'Reporting and analytics',
      'Priority support',
    ],
    highlighted: false,
  },
]

const PLAN_FEATURES = Object.fromEntries(UPGRADE_TIERS.map((t) => [t.plan, t.features]))
const PLAN_PRICE = Object.fromEntries(UPGRADE_TIERS.map((t) => [t.plan, `$${t.monthly}/mo`]))

export default function BillingPage() {
  const [billing, setBilling] = useState<OrgBilling | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [annual, setAnnual] = useState(false)
  const searchParams = useSearchParams()

  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null)
  const [licenseEmail, setLicenseEmail] = useState('')
  const [licenseOrgName, setLicenseOrgName] = useState('')
  const [licenseSubmitting, setLicenseSubmitting] = useState(false)
  const [licenseError, setLicenseError] = useState<string | null>(null)
  const [licenseKey, setLicenseKey] = useState<string | null>(null)
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    fetch('/api/v1/billing')
      .then((r) => r.json())
      .then((r) => {
        setBilling(r.data)
        if (r.data?.self_hosted) {
          fetch('/api/v1/license')
            .then((lr) => lr.json())
            .then((lr) => setLicenseStatus(lr.data))
            .catch(() => {})
        }
      })
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

  async function handleLicenseRegister(e: React.FormEvent) {
    e.preventDefault()
    setLicenseError(null)
    setLicenseSubmitting(true)
    try {
      const res = await fetch('/api/v1/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: licenseEmail, org_name: licenseOrgName }),
      })
      const result = await res.json()
      if (!res.ok) {
        setLicenseError(result.error || 'Registration failed')
        return
      }
      setLicenseKey(result.data.key)
      setLicenseStatus({
        self_hosted: true,
        registered: true,
        info: result.data.info,
      })
    } catch {
      setLicenseError('Registration failed')
    } finally {
      setLicenseSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading billing...</div>
  }

  const currentPlan = billing?.plan_id || 'free'
  const isPaid = currentPlan !== 'free'
  const isCanceling = billing?.subscription?.cancel_at_period_end
  const trial = billing?.trial

  const cardVariant = success && isPaid ? 'success' : isPaid ? 'active' : 'default'

  return (
    <div className="space-y-8">
      {canceled && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          Checkout was canceled. No changes were made.
        </div>
      )}

      {trial?.active && !isPaid && (
        <div className="relative overflow-hidden rounded-xl border border-accent/40 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-6">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/10 blur-2xl" />
          <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-accent/10 blur-xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="text-lg">&#x2728;</span>
              <p className="text-base font-bold text-text-primary">
                You&apos;re on the Studio Trial
              </p>
            </div>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Every feature in preroll.io is unlocked right now — multi-user access, white-label portal, reporting, and more.
              You have <span className="font-semibold text-accent">{trial.days_left} {trial.days_left === 1 ? 'day' : 'days'}</span> left to explore.
            </p>
            <p className="mt-3 text-xs text-text-secondary">
              Pick a plan below to keep everything when your trial ends.
            </p>
          </div>
        </div>
      )}

      {trial && !trial.active && !isPaid && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-5">
          <p className="text-sm font-medium text-text-primary">
            Your Studio trial has ended
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Upgrade to restore access to unlimited clients, integrations, team features, and more.
          </p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-text-primary">Current Plan</h2>
        <div className={`relative mt-3 overflow-hidden rounded-xl border p-6 ${
          cardVariant === 'success'
            ? 'border-success/40 bg-gradient-to-br from-success/15 via-success/5 to-transparent'
            : cardVariant === 'active'
              ? 'border-accent/30 bg-gradient-to-br from-accent/10 via-surface-raised to-surface-raised'
              : 'border-border-default bg-surface-raised'
        }`}>
          {isPaid && (
            <>
              <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl ${cardVariant === 'success' ? 'bg-success/10' : 'bg-accent/10'}`} />
              <div className={`absolute -bottom-6 -left-6 h-20 w-20 rounded-full blur-2xl ${cardVariant === 'success' ? 'bg-success/10' : 'bg-accent/10'}`} />
            </>
          )}
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {isPaid && (
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cardVariant === 'success' ? 'bg-success/15' : 'bg-accent/15'}`}>
                    {cardVariant === 'success' ? (
                      <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                      </svg>
                    )}
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-bold text-text-primary">
                      {cardVariant === 'success'
                        ? `Welcome to ${PLAN_LABELS[currentPlan]}`
                        : PLAN_LABELS[currentPlan] || currentPlan}
                    </span>
                    {isPaid && !isCanceling && billing?.plan_status === 'active' && (
                      <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                        Active
                      </span>
                    )}
                    {billing?.plan_status && billing.plan_status !== 'active' && (
                      <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
                        {billing.plan_status}
                      </span>
                    )}
                    {isCanceling && (
                      <span className="rounded-full bg-error/10 px-2.5 py-0.5 text-xs font-medium text-error">
                        Cancels at period end
                      </span>
                    )}
                  </div>
                  {isPaid && (
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {cardVariant === 'success'
                        ? "Your subscription is active — you're all set."
                        : PLAN_PRICE[currentPlan] && (
                            <>
                              {PLAN_PRICE[currentPlan]}
                              {billing?.subscription?.current_period_end && (
                                <> &middot; {isCanceling ? 'Ends' : 'Renews'} {new Date(billing.subscription.current_period_end).toLocaleDateString()}</>
                              )}
                            </>
                          )}
                    </p>
                  )}
                  {!isPaid && (
                    <p className="mt-0.5 text-sm text-text-secondary">
                      1 client, 1 show — upgrade below to unlock more.
                    </p>
                  )}
                </div>
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
            {isPaid && PLAN_FEATURES[currentPlan] && (
              <div className="mt-5 border-t border-border-default/50 pt-5">
                <p className="text-xs font-medium uppercase tracking-wider text-text-secondary mb-3">What&apos;s included</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PLAN_FEATURES[currentPlan].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                      <svg className={`h-3.5 w-3.5 shrink-0 ${cardVariant === 'success' ? 'text-success' : 'text-accent'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {billing?.self_hosted && licenseStatus && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary">License</h2>
          <div className="mt-3 rounded-xl border border-border-default bg-surface-raised p-6">
            {licenseStatus.registered && licenseStatus.info ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
                    <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Registered</p>
                    <p className="text-xs text-text-secondary">All features unlocked</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-text-secondary">Email</p>
                    <p className="text-sm text-text-secondary">{licenseStatus.info.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-secondary">Organization</p>
                    <p className="text-sm text-text-secondary">{licenseStatus.info.orgName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-secondary">Registered</p>
                    <p className="text-sm text-text-secondary">
                      {new Date(licenseStatus.info.issuedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {licenseKey && (
                  <div className="mt-5 rounded-lg border border-border-default bg-surface-overlay p-3">
                    <p className="text-xs font-medium text-text-secondary">License Key</p>
                    <p className="mt-1 break-all font-mono text-xs text-text-secondary">{licenseKey}</p>
                    <p className="mt-2 text-xs text-text-secondary">
                      Save this key. You can set it as <code className="text-text-secondary">PREROLL_LICENSE_KEY</code> in your environment for validation at startup.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-text-secondary">
                  Register your self-hosted installation. All features work without a license key — registration enables update notifications and helps us understand how preroll.io is being used.
                </p>
                <form onSubmit={handleLicenseRegister} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="license-email" className="block text-xs font-medium text-text-secondary">
                      Email
                    </label>
                    <input
                      id="license-email"
                      type="email"
                      required
                      value={licenseEmail}
                      onChange={(e) => setLicenseEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1 block w-full rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label htmlFor="license-org" className="block text-xs font-medium text-text-secondary">
                      Organization Name
                    </label>
                    <input
                      id="license-org"
                      type="text"
                      required
                      value={licenseOrgName}
                      onChange={(e) => setLicenseOrgName(e.target.value)}
                      placeholder="Your Company"
                      className="mt-1 block w-full rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  {licenseError && (
                    <p className="text-sm text-error">{licenseError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={licenseSubmitting}
                    className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                  >
                    {licenseSubmitting ? 'Registering...' : 'Register'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {!isPaid && (
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Upgrade</h2>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${!annual ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                Monthly
              </span>
              <button
                role="switch"
                aria-checked={annual}
                aria-label="Toggle annual billing"
                onClick={() => setAnnual(!annual)}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${annual ? 'bg-accent' : 'bg-border-default'}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${annual ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className={`text-sm ${annual ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                Annual
              </span>
              <span className={`rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success transition-opacity ${annual ? 'opacity-100' : 'opacity-0'}`}>
                Save 17%
              </span>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {UPGRADE_TIERS.map((tier) => {
              const price = annual ? tier.annual : tier.monthly
              const period = annual ? '/yr' : '/mo'

              return (
                <div
                  key={tier.plan}
                  className={`rounded-xl border p-6 flex flex-col ${
                    tier.highlighted
                      ? 'border-accent bg-surface-raised ring-1 ring-accent/20'
                      : 'border-border-default bg-surface-raised'
                  }`}
                >
                  <h3 className="text-lg font-semibold text-text-primary">
                    {tier.name}
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">{tier.description}</p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-text-primary">
                      ${price}
                    </span>
                    <span className="text-sm text-text-secondary">{period}</span>
                  </div>
                  <ul className="mt-5 space-y-2.5 flex-1">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                        <svg className="h-4 w-4 mt-0.5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleUpgrade(tier.plan, annual ? 'year' : 'month')}
                    disabled={!!upgrading}
                    className={`mt-6 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                      tier.highlighted
                        ? 'bg-accent text-white hover:bg-accent-hover'
                        : 'bg-surface-overlay text-text-primary hover:bg-surface-input border border-border-default'
                    }`}
                  >
                    {upgrading === tier.plan ? 'Redirecting...' : `Upgrade to ${tier.name}`}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
