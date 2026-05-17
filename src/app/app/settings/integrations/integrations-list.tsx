'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ConnectButton } from '@/components/integrations/connect-button'
import { ConnectedAccountCard } from '@/components/integrations/connected-account-card'

interface Provider {
  name: string
  displayName: string
  comingSoon: boolean
  note?: string
}

interface Integration {
  id: string
  provider: string
  account_name: string | null
  account_email: string | null
  account_avatar_url: string | null
  created_at: string
}

interface IntegrationsListProps {
  providers: Provider[]
  integrations: Integration[]
  autoConnectProvider?: string
  returnTo?: string
  connectedProvider?: string
  oauthError?: string
}

export function IntegrationsList({
  providers,
  integrations,
  autoConnectProvider,
  returnTo,
  connectedProvider,
  oauthError,
}: IntegrationsListProps) {
  useEffect(() => {
    if (connectedProvider) {
      toast.success(`${connectedProvider.replace(/_/g, ' ')} connected successfully.`)
    }
    if (oauthError) {
      toast.error(`Connection failed: ${oauthError.replace(/_/g, ' ')}`)
    }
    if (connectedProvider || oauthError) {
      const url = new URL(window.location.href)
      url.searchParams.delete('connected')
      url.searchParams.delete('error')
      url.searchParams.delete('detail')
      window.history.replaceState(null, '', url.toString())
    }
  }, [connectedProvider, oauthError])

  const connectedMap = new Map(
    integrations.map((i) => [i.provider, i])
  )
  const connectedProviders = providers.filter((p) => connectedMap.has(p.name))

  const [defaultProvider, setDefaultProvider] = useState<string | null>(null)
  const [defaultLoading, setDefaultLoading] = useState(true)
  const [savingDefault, setSavingDefault] = useState(false)

  useEffect(() => {
    fetch('/api/v1/org/default-delivery-provider')
      .then((res) => res.ok ? res.json() : null)
      .then((json) => setDefaultProvider(json?.data?.provider ?? null))
      .finally(() => setDefaultLoading(false))
  }, [])

  async function handleSetDefault(provider: string | null) {
    setSavingDefault(true)
    setDefaultProvider(provider)
    try {
      await fetch('/api/v1/org/default-delivery-provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
    } finally {
      setSavingDefault(false)
    }
  }

  return (
    <div className="max-w-xl">

      <div className="rounded-lg border border-border-subtle bg-surface-raised">
        <div className="divide-y divide-border-subtle px-4">
          {providers.map((provider) => {
            const connected = connectedMap.get(provider.name)
            if (connected) {
              return (
                <ConnectedAccountCard
                  key={provider.name}
                  provider={provider.name}
                  displayName={provider.displayName}
                  accountName={connected.account_name}
                  accountEmail={connected.account_email}
                  accountAvatarUrl={connected.account_avatar_url}
                  connectedAt={connected.created_at}
                  note={provider.note}
                />
              )
            }
            return (
              <ConnectButton
                key={provider.name}
                provider={provider.name}
                displayName={provider.displayName}
                comingSoon={provider.comingSoon}
                note={provider.note}
                autoConnect={autoConnectProvider === provider.name}
                returnTo={autoConnectProvider === provider.name ? returnTo : undefined}
              />
            )
          })}
        </div>
      </div>

      {connectedProviders.length > 0 && (
        <div className="mt-6 rounded-lg border border-border-subtle bg-surface-raised p-5">
          <h3 className="text-sm font-semibold text-text-primary">Default delivery provider</h3>
          <p className="mt-1 text-xs text-text-secondary">
            New episodes will automatically use this provider for file delivery. If not set, files are stored with PreRoll&apos;s built-in storage.
          </p>
          <div className="mt-4 space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="default-provider"
                checked={defaultProvider === null}
                onChange={() => handleSetDefault(null)}
                disabled={defaultLoading || savingDefault}
                className="accent-accent"
              />
              <span className="text-sm text-text-primary">PreRoll Storage (built-in)</span>
            </label>
            {connectedProviders.map((p) => (
              <label key={p.name} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="default-provider"
                  checked={defaultProvider === p.name}
                  onChange={() => handleSetDefault(p.name)}
                  disabled={defaultLoading || savingDefault}
                  className="accent-accent"
                />
                <span className="text-sm text-text-primary">{p.displayName}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
