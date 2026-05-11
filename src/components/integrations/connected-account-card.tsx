'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProviderLogo } from './provider-logo'

interface ConnectedAccountCardProps {
  provider: string
  displayName: string
  accountName: string | null
  accountEmail: string | null
  accountAvatarUrl: string | null
  connectedAt: string
  note?: string
}

export function ConnectedAccountCard({
  provider,
  displayName,
  accountName,
  accountEmail,
  connectedAt,
  note,
}: ConnectedAccountCardProps) {
  const router = useRouter()
  const [disconnecting, setDisconnecting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleDisconnect() {
    setDisconnecting(true)
    await fetch(`/api/v1/integrations?provider=${provider}`, { method: 'DELETE' })
    setDisconnecting(false)
    setConfirmOpen(false)
    router.refresh()
  }

  const subtitle = accountName || accountEmail
  const connectedDate = new Date(connectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3 min-w-0">
        <ProviderLogo provider={provider} className="w-9 h-9" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">{displayName}</span>
            <span className="inline-flex items-center rounded-full bg-success/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-success leading-none">
              Connected
            </span>
          </div>
          <p className="text-xs text-text-secondary truncate mt-0.5">
            {subtitle ? `${subtitle} · ${connectedDate}` : connectedDate}
          </p>
          {note && <p className="text-xs text-text-secondary mt-0.5">{note}</p>}
        </div>
      </div>
      <div className="shrink-0 ml-4">
        {confirmOpen ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
            >
              {disconnecting ? '...' : 'Confirm'}
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmOpen(true)}
            className="rounded-md border border-border-default bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-red-400 hover:border-red-400/30 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  )
}
