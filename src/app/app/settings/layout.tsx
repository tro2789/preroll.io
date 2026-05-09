'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Account', href: '/app/settings/account' },
  { label: 'Billing', href: '/app/settings/billing' },
  { label: 'Developer', href: '/app/settings/developer' },
  { label: 'Team', href: '/app/settings/team' },
  { label: 'Branding', href: '/app/settings/branding' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Manage your account, billing, and integrations.
      </p>

      <nav className="mt-6 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto border-b border-border-default">
        <div className="flex gap-1 min-w-max">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors -mb-px ${
                  isActive
                    ? 'text-accent-hover border-b-2 border-accent'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="mt-8">{children}</div>
    </div>
  )
}
