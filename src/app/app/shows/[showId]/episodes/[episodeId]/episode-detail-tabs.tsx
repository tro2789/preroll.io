'use client'

import { useState } from 'react'
import { DeliveryPanel } from '@/components/episodes/delivery-panel'
import { AiPanel } from '@/components/episodes/ai-panel'
import { DeliverablesTab } from '@/components/episodes/deliverables-tab'
import { EpisodeSidebar } from '@/components/episodes/episode-sidebar'
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

interface ClientInfo {
  id: string
  name: string
  email: string | null
  invite_code: string | null
  onboarded_at: string | null
}

interface EpisodeDetailTabsProps {
  episodeId: string
  showId: string
  integration: DeliveryIntegration | null
  deliverables: Deliverable[]
  connectedProviders: IntegrationProvider[]
  episode: EpisodeMeta
  imageUrl: string | null
  client: ClientInfo | null
  hasIntegration: boolean
}

const tabs = [
  { id: 'media', label: 'Media' },
  { id: 'content', label: 'Content' },
  { id: 'deliverables', label: 'Deliverables' },
]

export function EpisodeDetailTabs({
  episodeId, showId, integration, deliverables,
  connectedProviders, episode, imageUrl, client, hasIntegration,
}: EpisodeDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('media')

  const deliverableCount = deliverables.length
  const revisionsCount = deliverables.filter(d => d.status === 'revision_requested').length

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
      {/* Main: tabs */}
      <div className="min-w-0">
        <div className="flex gap-1 border-b border-border-default">
          {tabs.map((tab) => {
            const count = tab.id === 'deliverables' ? deliverableCount : undefined
            const hasAlert = tab.id === 'deliverables' && revisionsCount > 0

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors -mb-px ${
                  activeTab === tab.id
                    ? 'text-accent-hover border-b-2 border-accent'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {tab.label}
                {count != null && count > 0 && (
                  <span className={`ml-1.5 text-xs ${hasAlert ? 'text-red-400' : 'text-text-tertiary'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-4">
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

      {/* Sidebar */}
      <EpisodeSidebar
        episodeId={episodeId}
        showId={showId}
        stage={episode.stage?.name || null}
        scheduledPublishDate={episode.scheduled_publish_date}
        publishedAt={episode.published_at}
        description={episode.description}
        notes={episode.notes}
        imageUrl={imageUrl}
        client={client}
      />
    </div>
  )
}
