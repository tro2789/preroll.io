'use client'

import { DeliveryPanel } from '@/components/episodes/delivery-panel'
import { AiPanel } from '@/components/episodes/ai-panel'
import type { IntegrationProvider } from '@/lib/integrations/types'
import type { Deliverable } from '@/lib/constants/deliverables'

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

interface EpisodeDetailContentProps {
  episodeId: string
  showId: string
  integration: DeliveryIntegration | null
  deliverables: Deliverable[]
  connectedProviders: IntegrationProvider[]
  episode: EpisodeMeta
  hasIntegration: boolean
  hasAudioFiles: boolean
}

export function EpisodeDetailContent({
  episodeId, showId, integration, deliverables,
  connectedProviders, episode, hasIntegration, hasAudioFiles,
}: EpisodeDetailContentProps) {
  const sharedCount = deliverables.length
  const pendingCount = deliverables.filter(d => d.status === 'pending').length
  const revisionsCount = deliverables.filter(d => d.status === 'revision_requested').length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
      <section>
        <DeliveryPanel
          episodeId={episodeId}
          showId={showId}
          integration={integration}
          deliverables={deliverables}
          connectedProviders={connectedProviders}
          episode={episode}
          hideSidebar
        />

        {sharedCount > 0 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
            <span>{sharedCount} file{sharedCount !== 1 ? 's' : ''} shared</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500/15 text-amber-400 px-2 py-0.5 text-xs font-medium">
                {pendingCount} pending
              </span>
            )}
            {revisionsCount > 0 && (
              <span className="rounded-full bg-red-500/15 text-red-400 px-2 py-0.5 text-xs font-medium">
                {revisionsCount} revision{revisionsCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </section>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <AiPanel
          episodeId={episodeId}
          showId={showId}
          hasAudioFiles={hasAudioFiles}
        />
      </aside>
    </div>
  )
}
