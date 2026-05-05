'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ConnectedAccountCardProps {
  provider: string
  displayName: string
  accountName: string | null
  accountEmail: string | null
  accountAvatarUrl: string | null
  connectedAt: string
}

export function ConnectedAccountCard({
  provider,
  displayName,
  accountName,
  accountEmail,
  accountAvatarUrl,
  connectedAt,
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

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-surface-raised p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {accountAvatarUrl ? (
            <img src={accountAvatarUrl} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center">
              <span className="text-xs font-bold text-accent">
                {(accountName || displayName)[0]}
              </span>
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-text-primary">{displayName}</h3>
            <p className="text-xs text-text-secondary">
              {accountName || accountEmail || 'Connected'}
            </p>
            {accountEmail && accountName && (
              <p className="text-xs text-text-tertiary">{accountEmail}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-emerald-400">Connected</span>
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
                className="text-xs text-text-tertiary hover:text-text-secondary"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmOpen(true)}
              className="text-xs text-text-tertiary hover:text-red-400 transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-text-tertiary mt-2">
        Connected {new Date(connectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
    </div>
  )
}
