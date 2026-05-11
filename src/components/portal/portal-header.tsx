'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface PortalHeaderProps {
  clientName: string
  email: string
  orgDisplayName?: string
  logoUrl?: string
}

export function PortalHeader({ clientName, email, orgDisplayName, logoUrl }: PortalHeaderProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="border-b border-border-subtle bg-surface-raised/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/portal" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {logoUrl ? (
              <img src={logoUrl} alt={orgDisplayName || 'Logo'} className="h-6 w-auto" />
            ) : (
              <span className="text-sm font-bold tracking-widest uppercase text-text-primary hover:text-accent transition-colors">
                {orgDisplayName || 'preroll.io'}
              </span>
            )}
          </Link>
          <span className="text-border-default">/</span>
          <span className="text-sm text-text-secondary">{clientName}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-text-secondary hidden sm:block">{email}</span>
          <button
            onClick={handleSignOut}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
