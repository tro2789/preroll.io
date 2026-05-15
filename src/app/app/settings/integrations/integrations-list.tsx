'use client'

import { useEffect } from 'react'
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

  return (
    <div className="max-w-xl">
      {connectedProvider && (
        <div className="mb-4 rounded-lg bg-success/8 px-4 py-2.5 text-sm text-success">
          {connectedProvider.replace(/_/g, ' ')} connected successfully.
        </div>
      )}

      {oauthError && (
        <div className="mb-4 rounded-lg bg-error/8 px-4 py-2.5 text-sm text-error">
          Connection failed: {oauthError.replace(/_/g, ' ')}
        </div>
      )}

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
    </div>
  )
}
