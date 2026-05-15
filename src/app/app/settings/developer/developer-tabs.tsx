'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { WebhookEndpointList } from '@/components/webhooks/endpoint-list'
import { ApiKeyList } from '@/components/api-keys/api-key-list'
import { UpgradeGate } from '@/components/ui/upgrade-gate'

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
  { key: 'webhooks', label: 'Webhooks' },
  { key: 'api-keys', label: 'API Keys' },
] as const

type Tab = (typeof TABS)[number]['key']

interface DeveloperTabsProps {
  endpoints: Endpoint[]
  apiKeys: ApiKey[]
  canWebhooks: boolean
  canApiKeys: boolean
  initialTab?: string
}

export function DeveloperTabs({
  endpoints,
  apiKeys,
  canWebhooks,
  canApiKeys,
  initialTab,
}: DeveloperTabsProps) {
  const searchParams = useSearchParams()

  function resolveInitialTab(): Tab {
    const fromParam = initialTab || searchParams.get('tab')
    const match = TABS.find((t) => t.key === fromParam)
    return match?.key || 'webhooks'
  }

  const [activeTab, setActiveTab] = useState<Tab>(resolveInitialTab)

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    if (tab === 'webhooks') url.searchParams.delete('tab')
    else url.searchParams.set('tab', tab)
    window.history.replaceState(null, '', url.toString())
  }

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
              description="Access the preroll.io API to build custom automations, connect the MCP server, or integrate with your own tools. Available on the Pro plan."
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
