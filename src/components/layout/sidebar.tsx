'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { PLAN_LABELS } from '@/lib/constants/plans'

export interface OrgMembership {
  id: string
  name: string
  planId: string
  role: string
  logoUrl?: string
}

interface NavItem {
  label: string
  href: string
  icon: (props: { className?: string }) => React.JSX.Element
  desktopOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/app', icon: GridIcon },
  { label: 'Calendar', href: '/app/calendar', icon: CalendarIcon },
  { label: 'Reports', href: '/app/reports', icon: ChartIcon },
  { label: 'Shows', href: '/app/shows', icon: FilmIcon },
  { label: 'Clients', href: '/app/clients', icon: UsersIcon },
  { label: 'Docs', href: '/docs', icon: BookIcon, desktopOnly: true },
  { label: 'Settings', href: '/app/settings', icon: CogIcon },
]

function OrgSwitcher({ orgs, activeOrgId }: { orgs: OrgMembership[]; activeOrgId?: string }) {
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const activeOrg = orgs.find((o) => o.id === activeOrgId) || orgs[0]
  const otherOrgs = orgs.filter((o) => o.id !== activeOrg?.id)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function switchOrg(orgId: string) {
    setSwitching(true)
    try {
      const res = await fetch('/api/v1/org/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })
      if (!res.ok) return
      setOpen(false)
      router.refresh()
    } finally {
      setSwitching(false)
    }
  }

  if (!activeOrg) return null

  return (
    <div ref={ref} className="relative px-3">
      <button
        onClick={() => otherOrgs.length > 0 && setOpen(!open)}
        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
          otherOrgs.length > 0
            ? 'hover:bg-surface-raised cursor-pointer'
            : 'cursor-default'
        }`}
      >
        {activeOrg.logoUrl ? (
          <img src={activeOrg.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent text-sm font-bold shrink-0">
            {activeOrg.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{activeOrg.name}</p>
          <p className="text-xs text-text-tertiary">
            {PLAN_LABELS[activeOrg.planId] || activeOrg.planId} &middot; {activeOrg.role}
          </p>
        </div>
        {otherOrgs.length > 0 && (
          <ChevronIcon className={`h-4 w-4 text-text-tertiary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && otherOrgs.length > 0 && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-lg border border-border-default bg-surface-overlay shadow-lg py-1">
          {otherOrgs.map((org) => (
            <button
              key={org.id}
              onClick={() => switchOrg(org.id)}
              disabled={switching}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-raised transition-colors disabled:opacity-50"
            >
              {org.logoUrl ? (
                <img src={org.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-input text-text-secondary text-sm font-bold shrink-0">
                  {org.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{org.name}</p>
                <p className="text-xs text-text-tertiary">
                  {PLAN_LABELS[org.planId] || org.planId} &middot; {org.role}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface SidebarProps {
  orgs: OrgMembership[]
  activeOrgId?: string
}

export function Sidebar({ orgs, activeOrgId }: SidebarProps) {
  const pathname = usePathname()
  const showSwitcher = orgs.length > 0

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow bg-surface-base border-r border-border-default pt-6 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-6 mb-2">
            <span className="text-sm font-semibold text-text-secondary uppercase tracking-widest">
              PreRoll
            </span>
          </div>
          {showSwitcher && (
            <div className="mb-4">
              <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} />
            </div>
          )}
          <nav className="flex-1 px-3 space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                item.href === '/app'
                  ? pathname === '/app'
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-accent-muted text-accent-hover'
                      : 'text-text-tertiary hover:text-text-primary hover:bg-surface-raised'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isActive
                        ? 'text-accent'
                        : 'text-text-tertiary group-hover:text-text-secondary'
                    }`}
                  />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-base border-t border-border-default flex justify-around pb-[env(safe-area-inset-bottom,0px)]">
        {navItems.filter((item) => !item.desktopOnly).map((item) => {
          const isActive =
            item.href === '/app'
              ? pathname === '/app'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-h-[44px] px-3 py-2.5 text-xs transition-colors ${
                isActive
                  ? 'text-accent-hover'
                  : 'text-text-tertiary'
              }`}
            >
              <item.icon className="h-5 w-5 mb-0.5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  )
}

function FilmIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function CogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.212-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}
