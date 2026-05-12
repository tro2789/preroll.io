'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const SEGMENT_LABELS: Record<string, string> = {
  app: 'Home',
  shows: 'Shows',
  clients: 'Clients',
  calendar: 'Calendar',
  reports: 'Reports',
  settings: 'Settings',
  episodes: 'Episodes',
  billing: 'Billing',
  integrations: 'Integrations',
  team: 'Team',
  branding: 'Branding',
}

export function Topbar() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const crumbs: { label: string; href: string }[] = []
  let path = ''
  for (const seg of segments) {
    path += `/${seg}`
    const label = SEGMENT_LABELS[seg]
    if (label) {
      crumbs.push({ label, href: path })
    }
  }

  return (
    <div className="hidden md:flex items-center h-12 px-6 border-b border-border-subtle bg-surface-base/80 backdrop-blur-sm sticky top-0 z-30">
      <nav className="flex items-center gap-1.5 text-sm min-w-0">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-fg-faint">/</span>}
            {i === crumbs.length - 1 ? (
              <span className="font-medium text-text-primary truncate">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-text-secondary hover:text-text-primary transition-colors truncate">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <div className="flex-1 flex justify-center px-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border-subtle bg-surface-input text-text-secondary text-sm w-full max-w-[280px] cursor-default">
          <SearchIcon className="h-3.5 w-3.5 text-fg-faint shrink-0" />
          <span className="text-fg-faint text-xs">Search...</span>
          <kbd className="ml-auto text-[10px] font-mono text-fg-faint border border-border-subtle rounded px-1 py-0.5">⌘K</kbd>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/app/shows"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          New episode
        </Link>
        <button className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors" title="Notifications">
          <BellIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  )
}
