'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Billing', href: '/app/settings/billing' },
  { label: 'Team', href: '/app/settings/team' },
  { label: 'Branding', href: '/app/settings/branding' },
  { label: 'Integrations', href: '/app/settings/integrations' },
  { label: 'Webhooks', href: '/app/settings/webhooks' },
  { label: 'API Keys', href: '/app/settings/api-keys' },
  { label: 'License', href: '/app/settings/license' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Manage your integrations, webhooks, and API access.
      </p>

      <nav className="mt-6 flex gap-1 border-b border-border-default">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 text-sm font-medium transition-colors -mb-px ${
                isActive
                  ? 'text-accent-hover border-b-2 border-accent'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-8">{children}</div>
    </div>
  )
}
