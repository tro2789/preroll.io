'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { QuickCreate } from '@/components/dashboard/quick-create'
import { GlobalSearch } from '@/components/search/global-search'

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
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const crumbs: { label: string; href: string }[] = []
  let path = ''
  for (const seg of segments) {
    path += `/${seg}`
    const label = SEGMENT_LABELS[seg]
    if (label) {
      crumbs.push({ label, href: path })
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setSearchOpen(true)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <>
      <div className="hidden md:flex items-center gap-3 h-12 px-4 border-b border-border-subtle bg-surface-base sticky top-0 z-30">
        {/* Breadcrumbs — left */}
        <nav className="flex items-center gap-1.5 text-[13px] min-w-0">
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right group: search, new, bell */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center justify-center w-[30px] h-[30px] rounded-[7px] border border-transparent text-text-secondary hover:bg-surface-raised hover:border-border-subtle hover:text-text-primary transition-colors"
            title="Search (⌘K)"
          >
            <SearchIcon className="h-4 w-4" />
          </button>

          {/* New button */}
          <button
            onClick={() => setQuickCreateOpen(true)}
            className="flex items-center gap-1 px-2 py-[3.5px] text-xs font-semibold rounded-md border border-accent bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            New
          </button>

          {/* Notification bell — icon button */}
          <button
            className="flex items-center justify-center w-[30px] h-[30px] rounded-[7px] border border-transparent text-text-secondary hover:bg-surface-raised hover:border-border-subtle hover:text-text-primary transition-colors"
            title="Notifications"
          >
            <BellIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <QuickCreate externalOpen={quickCreateOpen} onOpenChange={setQuickCreateOpen} />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
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
