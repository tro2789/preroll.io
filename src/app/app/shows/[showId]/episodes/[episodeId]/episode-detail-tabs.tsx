'use client'

import { DeliveryPanel } from '@/components/episodes/delivery-panel'
import { AiPanel } from '@/components/episodes/ai-panel'
import { DeliverablesTab } from '@/components/episodes/deliverables-tab'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
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

export function EpisodeDetailTabs({
  episodeId, showId, integration, deliverables,
  connectedProviders, episode, hasIntegration,
}: EpisodeDetailTabsProps) {
  const revisionsCount = deliverables.filter(d => d.status === 'revision_requested').length

  return (
    <Tabs defaultValue="media">
      <TabsList variant="line" className="w-full justify-start gap-0">
        <TabsTrigger value="media" className="px-4 py-2.5 text-sm">
          Media
        </TabsTrigger>
        <TabsTrigger value="content" className="px-4 py-2.5 text-sm">
          Content
        </TabsTrigger>
        <TabsTrigger value="deliverables" className="px-4 py-2.5 text-sm">
          Deliverables
          {deliverables.length > 0 && (
            <Badge variant={revisionsCount > 0 ? 'destructive' : 'secondary'} className="ml-1.5">
              {deliverables.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="media" className="mt-5">
        <DeliveryPanel
          episodeId={episodeId}
          showId={showId}
          integration={integration}
          deliverables={deliverables}
          connectedProviders={connectedProviders}
          episode={episode}
          hideSidebar
        />
      </TabsContent>

      <TabsContent value="content" className="mt-5">
        <AiPanel
          episodeId={episodeId}
          showId={showId}
          hasAudioFiles={hasIntegration}
        />
      </TabsContent>

      <TabsContent value="deliverables" className="mt-5">
        <DeliverablesTab
          episodeId={episodeId}
          showId={showId}
          deliverables={deliverables}
        />
      </TabsContent>
    </Tabs>
  )
}
