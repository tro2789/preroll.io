'use client'

import { usePathname } from 'next/navigation'

interface HeaderProps {
  email: string
  displayName?: string | null
}

const routeLabels: Record<string, string> = {
  '/app': 'Dashboard',
  '/app/shows': 'Shows',
  '/app/clients': 'Clients',
  '/app/settings': 'Settings',
}

function getPageLabel(pathname: string): string {
  // Exact match first
  if (routeLabels[pathname]) return routeLabels[pathname]
  // Check prefixes for nested routes
  const segments = pathname.split('/')
  while (segments.length > 2) {
    segments.pop()
    const parent = segments.join('/')
    if (routeLabels[parent]) return routeLabels[parent]
  }
  return 'Dashboard'
}

export function Header({ email, displayName }: HeaderProps) {
  const pathname = usePathname()
  const pageLabel = getPageLabel(pathname)

  return (
    <header className="sticky top-0 z-30 bg-surface-base/80 backdrop-blur-sm border-b border-border-subtle">
      <div className="flex items-center justify-between h-14 px-4 sm:px-6">
        {/* Mobile logo */}
        <span className="md:hidden text-sm font-semibold text-text-secondary uppercase tracking-widest">
          PreRoll
        </span>

        {/* Desktop: page context */}
        <span className="hidden md:block text-sm font-medium text-text-secondary">
          {pageLabel}
        </span>

        <div className="flex items-center gap-4">
          <span className="text-sm text-text-tertiary hidden sm:inline">{displayName || email}</span>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="text-sm text-text-tertiary hover:text-text-primary transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
