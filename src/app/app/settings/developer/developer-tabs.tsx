'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ConnectButton } from '@/components/integrations/connect-button'
import { ConnectedAccountCard } from '@/components/integrations/connected-account-card'
import { WebhookEndpointList } from '@/components/webhooks/endpoint-list'
import { ApiKeyList } from '@/components/api-keys/api-key-list'
import { UpgradeGate } from '@/components/ui/upgrade-gate'

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

interface Endpoint {
  id: string
  url: string
  events: string[]
  is_active: boolean
  description: string | null
  created_at: string
  updated_at: string
}

interface ApiKey {
  id: string
  name: string
  last_used_at: string | null
  created_at: string
}

const TABS = [
  { key: 'integrations', label: 'Integrations' },
  { key: 'webhooks', label: 'Webhooks' },
  { key: 'api-keys', label: 'API Keys' },
] as const

type Tab = (typeof TABS)[number]['key']

interface DeveloperTabsProps {
  providers: Provider[]
  integrations: Integration[]
  endpoints: Endpoint[]
  apiKeys: ApiKey[]
  canIntegrations: boolean
  canWebhooks: boolean
  canApiKeys: boolean
  autoConnectProvider?: string
  returnTo?: string
  connectedProvider?: string
  oauthError?: string
  initialTab?: string
}

export function DeveloperTabs({
  providers,
  integrations,
  endpoints,
  apiKeys,
  canIntegrations,
  canWebhooks,
  canApiKeys,
  autoConnectProvider,
  returnTo,
  connectedProvider,
  oauthError,
  initialTab,
}: DeveloperTabsProps) {
  const searchParams = useSearchParams()

  function resolveInitialTab(): Tab {
    if (autoConnectProvider || connectedProvider || oauthError) return 'integrations'
    const fromParam = initialTab || searchParams.get('tab')
    const match = TABS.find((t) => t.key === fromParam)
    return match?.key || 'integrations'
  }

  const [activeTab, setActiveTab] = useState<Tab>(resolveInitialTab)

  useEffect(() => {
    if (connectedProvider || oauthError) {
      const url = new URL(window.location.href)
      url.searchParams.delete('connected')
      url.searchParams.delete('error')
      url.searchParams.delete('detail')
      window.history.replaceState(null, '', url.toString())
    }
  }, [connectedProvider, oauthError])

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    if (tab === 'integrations') url.searchParams.delete('tab')
    else url.searchParams.set('tab', tab)
    window.history.replaceState(null, '', url.toString())
  }

  const connectedMap = new Map(
    integrations.map((i) => [i.provider, i])
  )

  return (
    <div>
      <div className="flex gap-1 border-b border-border-default -mx-4 sm:-mx-0 px-4 sm:px-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors -mb-px ${
              activeTab === tab.key
                ? 'text-accent-hover border-b-2 border-accent'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === 'integrations' && (
          canIntegrations ? (
            <div className="space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Connected Accounts
              </h2>

              {connectedProvider && (
                <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
                  Successfully connected {connectedProvider.replace('_', ' ')}.
                </div>
              )}

              {oauthError && (
                <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
                  Connection failed: {oauthError.replace(/_/g, ' ')}
                </div>
              )}

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
          ) : (
            <UpgradeGate
              feature="Integrations"
              description="Connect Frame.io, Google Drive, Vimeo, and more to streamline your delivery workflow. Available on the Pro plan."
              tier="Pro"
              icon={
                <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.07a4.5 4.5 0 0 0-1.242-7.244l4.5-4.5a4.5 4.5 0 1 1 6.364 6.364l-1.757 1.757" />
                </svg>
              }
            />
          )
        )}

        {activeTab === 'webhooks' && (
          canWebhooks ? (
            <WebhookEndpointList endpoints={endpoints} />
          ) : (
            <UpgradeGate
              feature="Webhooks"
              description="Send real-time event notifications to external services when episodes move through your pipeline. Available on the Pro plan."
              tier="Pro"
              icon={
                <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              }
            />
          )
        )}

        {activeTab === 'api-keys' && (
          canApiKeys ? (
            <ApiKeyList keys={apiKeys} />
          ) : (
            <UpgradeGate
              feature="API Keys"
              description="Access the PreRoll API to build custom automations, connect the MCP server, or integrate with your own tools. Available on the Pro plan."
              tier="Pro"
              icon={
                <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                </svg>
              }
            />
          )
        )}
      </div>
    </div>
  )
}
