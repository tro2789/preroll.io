import Link from 'next/link'

interface UpgradeGateProps {
  feature: string
  description: string
  tier: 'Pro' | 'Studio'
  icon: React.ReactNode
}

export function UpgradeGate({ feature, description, tier, icon }: UpgradeGateProps) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-raised p-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-text-primary">{feature}</h3>
      <p className="mt-2 text-sm text-text-secondary max-w-md mx-auto">
        {description}
      </p>
      <Link
        href="/app/settings/billing"
        className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
      >
        Upgrade to {tier}
      </Link>
    </div>
  )
}
