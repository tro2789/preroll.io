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
      '10 GB storage',
      'Episode board with drag-and-drop',
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
      '500 GB storage',
      'All integrations (Frame.io, Transistor, Drive, Vimeo)',
      'Webhook egress and API keys',
      'MCP server access',
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
      '2 TB storage',
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
    <div className="mx-auto max-w-5xl">
        {/* Segmented toggle */}
        <div className="flex items-center justify-center">
          <div className="relative inline-flex items-center rounded-[9px] border border-border-subtle bg-surface-input p-[3px]">
            <button
              onClick={() => setAnnual(false)}
              className={`relative rounded-[7px] px-4 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                !annual
                  ? 'bg-surface-overlay text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`relative rounded-[7px] px-4 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                annual
                  ? 'bg-surface-overlay text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              Annual
            </button>
            <span
              aria-hidden={!annual}
              className={`absolute left-full ml-3 whitespace-nowrap rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success transition-opacity ${annual ? 'opacity-100' : 'opacity-0'}`}
            >
              Save 17%
            </span>
          </div>
        </div>

        {/* Price grid */}
        <div className="mt-12 grid grid-cols-1 gap-[18px] max-[880px]:max-w-[420px] max-[880px]:mx-auto min-[881px]:grid-cols-3">
          {TIERS.map((tier) => {
            const price = annual ? tier.annual : tier.monthly
            const period = price === 0 ? '' : annual ? '/yr' : '/mo'

            return (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-[13px] border p-[26px_24px] transition-[border-color,transform] duration-200 hover:-translate-y-[3px] hover:border-border-strong ${
                  tier.highlighted
                    ? 'border-accent-quiet shadow-[0_24px_60px_-28px_oklch(0.715_0.155_40_/_0.4)]'
                    : 'border-border-default bg-surface-raised'
                }`}
                style={
                  tier.highlighted
                    ? { background: 'linear-gradient(180deg, oklch(0.715 0.155 40 / 0.06), var(--color-surface-raised))' }
                    : undefined
                }
              >
                {/* "Most popular" pill */}
                {tier.highlighted && (
                  <span className="absolute -top-[10px] left-6 rounded-full bg-accent px-[9px] py-[3px] font-[family-name:var(--font-mono)] text-[10.5px] font-semibold uppercase tracking-[0.04em] text-white">
                    Most popular
                  </span>
                )}

                {/* Plan name */}
                <div className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-text-primary">
                  {tier.name}
                </div>

                {/* Description */}
                <div className="mt-[5px] min-h-[34px] text-[13px] text-text-tertiary">
                  {tier.description}
                </div>

                {/* Price */}
                <div className="mt-[18px] flex items-baseline gap-[6px]">
                  <span className="font-[family-name:var(--font-display)] text-[38px] font-semibold tracking-[-0.02em] text-text-primary">
                    ${price}
                  </span>
                  {period && (
                    <span className="text-[13px] text-text-tertiary">{period}</span>
                  )}
                </div>

                {/* CTA button */}
                <div className="mt-5">
                  <Link
                    href={tier.href}
                    className={`flex w-full items-center justify-center rounded-[9px] px-[18px] py-[10px] text-[14.5px] font-medium transition-[background,border-color,transform,box-shadow] duration-200 ${
                      tier.highlighted
                        ? 'border border-accent bg-accent font-semibold text-white shadow-[0_0_0_0_var(--color-accent-tint),0_8px_24px_-8px_oklch(0.715_0.155_40_/_0.55)] hover:border-accent-hover hover:bg-accent-hover hover:shadow-[0_0_0_4px_var(--color-accent-tint),0_12px_32px_-8px_oklch(0.715_0.155_40_/_0.65)] hover:-translate-y-px'
                        : 'border border-border-default bg-surface-raised text-text-primary hover:border-border-strong hover:bg-surface-overlay hover:-translate-y-px'
                    }`}
                  >
                    {tier.cta}
                  </Link>
                </div>

                {/* Feature list */}
                <ul className="mt-[22px] flex flex-col gap-[11px] border-t border-border-subtle pt-[22px]" style={{ listStyle: 'none' }}>
                  {tier.features.map((feature) => {
                    const isSoon = typeof feature === 'object'
                    const label = isSoon ? feature.label : feature

                    return (
                      <li
                        key={label}
                        className={`flex items-start gap-[10px] text-[13.5px] ${
                          isSoon ? 'text-fg-faint' : 'text-text-secondary'
                        }`}
                      >
                        <CheckIcon
                          className={`mt-px h-4 w-4 shrink-0 ${
                            isSoon ? 'text-fg-faint' : 'text-accent'
                          }`}
                        />
                        <span>
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
              </div>
            )
          })}
        </div>

        <p className="mt-7 text-center text-[13px] text-fg-faint">
          Want to run it yourself?{' '}
          <Link href="/docs/developer/self-hosting" className="text-accent hover:text-accent-hover transition-colors">
            preroll.io is open source and self-hostable.
          </Link>
        </p>
    </div>
  )
}
