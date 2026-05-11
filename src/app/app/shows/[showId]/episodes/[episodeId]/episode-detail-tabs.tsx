'use client'

import { useState } from 'react'
import { DeliveryPanel } from '@/components/episodes/delivery-panel'
import { AiPanel } from '@/components/episodes/ai-panel'
import { DeliverablesTab } from '@/components/episodes/deliverables-tab'
import type { IntegrationProvider } from '@/lib/integrations/types'

interface Deliverable {
  id: string
  type: string
  title: string
  description: string | null
  file_url: string | null
  status: string
  reviewer_notes: string | null
  reviewed_at: string | null
  created_at: string
}

interface EpisodeMeta {
  scheduled_publish_date: string | null
  published_at: string | null
  description: string | null
  notes: string | null
  stage: { name: string } | null
}

interface DeliveryIntegration {
  provider: IntegrationProvider
  externalProjectId: string | null
  externalFolderId: string | null
  externalViewUrl: string | null
  displayName: string
  acceptedMimeTypes?: string[]
}

interface EpisodeDetailTabsProps {
  episodeId: string
  showId: string
  integration: DeliveryIntegration | null
  deliverables: Deliverable[]
  connectedProviders: IntegrationProvider[]
  episode: EpisodeMeta
  hasIntegration: boolean
}

const TABS = [
  { id: 'media', label: 'Media' },
  { id: 'content', label: 'Content' },
  { id: 'deliverables', label: 'Deliverables' },
] as const

export function EpisodeDetailTabs({
  episodeId, showId, integration, deliverables,
  connectedProviders, episode, hasIntegration,
}: EpisodeDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<string>('media')

  const revisionsCount = deliverables.filter(d => d.status === 'revision_requested').length

  return (
    <div>
      <div className="flex gap-1 border-b border-border-default">
        {TABS.map((tab) => {
          const badge = tab.id === 'deliverables' && deliverables.length > 0
            ? deliverables.length
            : null

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'text-text-primary border-b-2 border-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
              {badge != null && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  revisionsCount > 0 && tab.id === 'deliverables'
                    ? 'bg-red-500/15 text-red-400'
                    : 'bg-surface-overlay text-text-secondary'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        {activeTab === 'media' && (
          <DeliveryPanel
            episodeId={episodeId}
            showId={showId}
            integration={integration}
            deliverables={deliverables}
            connectedProviders={connectedProviders}
            episode={episode}
            hideSidebar
          />
        )}

        {activeTab === 'content' && (
          <AiPanel
            episodeId={episodeId}
            showId={showId}
            hasAudioFiles={hasIntegration}
          />
        )}

        {activeTab === 'deliverables' && (
          <DeliverablesTab
            episodeId={episodeId}
            showId={showId}
            deliverables={deliverables}
          />
        )}
      </div>
    </div>
  )
}
