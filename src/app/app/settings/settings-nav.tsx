'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Account', href: '/app/settings/account' },
  { label: 'Branding', href: '/app/settings/branding' },
  { label: 'Billing', href: '/app/settings/billing' },
  { label: 'AI', href: '/app/settings/ai' },
  { label: 'Integrations', href: '/app/settings/integrations' },
  { label: 'Developer', href: '/app/settings/developer' },
  { label: 'Team', href: '/app/settings/team' },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <>
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
    </>
  )
}
