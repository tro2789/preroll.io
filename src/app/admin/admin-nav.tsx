'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Overview', href: '/admin', exact: true },
  { label: 'Organizations', href: '/admin/orgs', exact: false },
  { label: 'Users', href: '/admin/users', exact: false },
  { label: 'Billing', href: '/admin/billing', exact: false },
  { label: 'Activity', href: '/admin/activity', exact: false },
  { label: 'Security', href: '/admin/security', exact: false },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <>
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href)
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
