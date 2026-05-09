'use client'

import { useState } from 'react'
import Link from 'next/link'

const TIERS = [
  {
    name: 'Free',
    monthly: 0,
    annual: 0,
    description: 'Try it out with one client.',
    features: [
      '1 client, 1 show',
      'Episode pipeline with drag-and-drop',
      'Client portal with magic-link auth',
      'Calendar view',
    ],
    cta: 'Get Started',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Pro',
    monthly: 29,
    annual: 289,
    description: 'For producers managing multiple shows.',
    features: [
      'Unlimited clients and shows',
      'All integrations (Frame.io, Transistor, Drive, Vimeo)',
      'Webhook egress and API keys',
      'MCP server access',
      'Episode templates',
      'Deliverable approval workflows',
    ],
    cta: 'Start Free, Upgrade Anytime',
    href: '/signup',
    highlighted: true,
  },
  {
    name: 'Studio',
    monthly: 79,
    annual: 789,
    description: 'For teams and agencies.',
    features: [
      'Everything in Pro',
      'Multi-user access with roles',
      'White-label client portal',
      'Reporting and analytics',
      { label: 'SSO / SAML', soon: true },
      'Priority support',
    ],
    cta: 'Start Free, Upgrade Anytime',
    href: '/signup',
    highlighted: false,
  },
] as const

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

export default function PricingSection() {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" className="px-6 py-24 scroll-mt-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-text-primary">
          Simple, honest pricing.
        </h2>

        <div className="mt-6 flex items-center justify-center gap-3">
          <span className={`text-sm ${!annual ? 'text-text-primary font-medium' : 'text-text-tertiary'}`}>
            Monthly
          </span>
          <button
            role="switch"
            aria-checked={annual}
            aria-label="Toggle annual billing"
            onClick={() => setAnnual(!annual)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${annual ? 'bg-accent' : 'bg-border-default'}`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${annual ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
          <span className={`text-sm ${annual ? 'text-text-primary font-medium' : 'text-text-tertiary'}`}>
            Annual
          </span>
          <span aria-hidden={!annual} className={`rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success transition-opacity ${annual ? 'opacity-100' : 'opacity-0'}`}>
            Save 17%
          </span>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          {TIERS.map((tier) => {
            const price = annual ? tier.annual : tier.monthly
            const period = price === 0 ? '' : annual ? '/yr' : '/mo'

            return (
              <div
                key={tier.name}
                className={`rounded-xl border p-6 flex flex-col ${
                  tier.highlighted
                    ? 'border-accent bg-surface-raised ring-1 ring-accent/20'
                    : 'border-border-subtle bg-surface-raised'
                }`}
              >
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-text-primary">{tier.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-text-primary">
                    ${price}
                  </span>
                  {period && <span className="text-sm text-text-tertiary">{period}</span>}
                </div>
                <p className="mt-2 text-sm text-text-secondary">{tier.description}</p>
                <ul className="mt-6 space-y-2.5 flex-1">
                  {tier.features.map((feature) => {
                    const isSoon = typeof feature === 'object'
                    const label = isSoon ? feature.label : feature
                    return (
                      <li key={label} className="flex items-start gap-2 text-sm">
                        <CheckIcon className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                        <span className="text-text-secondary">
                          {label}
                          {isSoon && (
                            <span className="ml-1.5 rounded-full bg-surface-overlay px-2 py-0.5 text-xs text-text-tertiary">
                              Soon
                            </span>
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <Link
                  href={tier.href}
                  className={`mt-6 block rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                    tier.highlighted
                      ? 'bg-accent text-white hover:bg-accent-hover'
                      : 'bg-surface-overlay text-text-primary hover:bg-surface-input border border-border-default'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            )
          })}
        </div>
        <p className="mt-8 text-center text-sm text-text-tertiary">
          Want to run it yourself?{' '}
          <Link href="/docs/self-hosting" className="text-accent hover:text-accent-hover transition-colors">
            PreRoll is open source and self-hostable.
          </Link>
        </p>
      </div>
    </section>
  )
}
