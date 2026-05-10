'use client'

import { useState, useEffect } from 'react'
import { ProviderLogo } from './provider-logo'

interface ConnectButtonProps {
  provider: string
  displayName: string
  comingSoon?: boolean
  note?: string
  autoConnect?: boolean
  returnTo?: string
}

export function ConnectButton({ provider, displayName, comingSoon, note, autoConnect, returnTo }: ConnectButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    const params = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''
    const res = await fetch(`/api/v1/integrations/${provider}/auth-url${params}`)
    const json = await res.json()
    if (json.data?.url) {
      window.location.href = json.data.url
    } else {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (autoConnect && !comingSoon) handleConnect()
  }, [])

  return (
    <div className={`flex items-center justify-between py-3 ${comingSoon ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-3 min-w-0">
        <ProviderLogo provider={provider} className="w-9 h-9" />
        <div className="min-w-0">
          <span className="text-sm font-medium text-text-primary">{displayName}</span>
          {note && <p className="text-xs text-text-tertiary mt-0.5">{note}</p>}
        </div>
      </div>
      <div className="shrink-0 ml-4">
        {comingSoon ? (
          <span className="text-xs text-text-tertiary">Coming soon</span>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        )}
      </div>
    </div>
  )
}
