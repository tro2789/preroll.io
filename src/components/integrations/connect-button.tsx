'use client'

import { useState } from 'react'
import { ProviderLogo } from './provider-logo'

interface ConnectButtonProps {
  provider: string
  displayName: string
  comingSoon?: boolean
  note?: string
}

export function ConnectButton({ provider, displayName, comingSoon, note }: ConnectButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    const res = await fetch(`/api/v1/integrations/${provider}/auth-url`)
    const json = await res.json()
    if (json.data?.url) {
      window.location.href = json.data.url
    } else {
      setLoading(false)
    }
  }

  if (comingSoon) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-raised p-5 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProviderLogo provider={provider} />
            <div>
              <h3 className="text-sm font-medium text-text-primary">{displayName}</h3>
              <p className="text-xs text-text-tertiary mt-1">Coming soon</p>
            </div>
          </div>
          <span className="rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs text-text-tertiary">
            Coming Soon
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ProviderLogo provider={provider} />
          <div>
            <h3 className="text-sm font-medium text-text-primary">{displayName}</h3>
            <p className="text-xs text-text-tertiary mt-1">Not connected</p>
            {note && <p className="text-xs text-text-tertiary mt-1">{note}</p>}
          </div>
        </div>
        <button
          onClick={handleConnect}
          disabled={loading}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    </div>
  )
}
