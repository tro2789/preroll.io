'use client'

import { useState } from 'react'

interface WelcomeCardProps {
  orgDisplayName?: string
}

export function WelcomeCard({ orgDisplayName }: WelcomeCardProps) {
  const [dismissed, setDismissed] = useState(false)

  async function handleDismiss() {
    setDismissed(true)
    await fetch('/api/v1/portal/welcome-dismiss', { method: 'POST' })
  }

  if (dismissed) return null

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text-primary">Here&apos;s what you can do here</h2>
          <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
            {orgDisplayName || 'Your producer'} uses this portal to share work with you. You&apos;ll find everything for your shows in one place.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-text-secondary">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent/60 shrink-0" />
              Review and approve deliverables
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent/60 shrink-0" />
              Track episode progress through the pipeline
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent/60 shrink-0" />
              Access show assets and brand materials
            </li>
          </ul>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss welcome guide"
          className="shrink-0 rounded-md border border-border-default bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-input focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-raised transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
