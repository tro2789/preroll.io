'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PipelineBoard } from '@/components/episodes/pipeline-board'
import { StageManagerTrigger } from '@/components/episodes/stage-manager-trigger'
import { QuickCreateEpisode } from '@/components/episodes/quick-create-episode'
import { BatchAiButton } from '@/components/shows/batch-ai-button'
import { ShowDetailsTab } from '@/components/shows/show-details-tab'
import { ShowAssetsTab } from '@/components/shows/show-assets-tab'
import { ShowTemplatesTab } from '@/components/shows/show-templates-tab'
import { ClientPortalSection } from '@/components/client-portal-section'
import { DistributionSettings } from '@/components/shows/distribution-settings'
import { ShowAiSettings } from '@/components/shows/show-ai-settings'
import { ALL_GENERATION_TYPES } from '@/lib/ai/constants'

const TABS = [
  { key: 'episodes', label: 'Episodes' },
  { key: 'assets', label: 'Assets' },
  { key: 'share', label: 'Share' },
  { key: 'details', label: 'Details' },
  { key: 'templates', label: 'Templates' },
  { key: 'distribution', label: 'Distribution' },
  { key: 'ai', label: 'AI' },
] as const

type Tab = (typeof TABS)[number]['key']

interface Stage {
  id: string
  name: string
  position: number
  wip_limit: number | null
  status_override: string | null
}

interface Episode {
  id: string
  title: string
  episode_number: number | null
  stage_id: string
  status: string
  position: number
  scheduled_publish_date: string | null
  frame_io_url: string | null
  image_url: string | null
  show_id: string
  distribution_status: string | null
  tags: { id: string; name: string; color: string }[]
  [key: string]: unknown
}

interface ShowData {
  id: string
  name: string
  description: string | null
  cover_art_url: string | null
  format: string | null
  schedule: string | null
  allow_client_downloads: boolean | null
  ai_auto_transcribe: boolean
  ai_auto_generate: string[] | null
  ai_tone: string | null
  ai_length: string | null
  episode_template: { description?: string; notes?: string } | null
  client_id: string | null
}

interface ClientData {
  id: string
  name: string
  email: string | null
  invite_code: string | null
  client_user_id: string | null
  onboarded_at: string | null
}

interface ShowTabsProps {
  show: ShowData
  client: ClientData | null
  stages: Stage[]
  episodes: Episode[]
}

export function ShowTabs({ show, client, stages, episodes }: ShowTabsProps) {
  const searchParams = useSearchParams()
  const initialTab = TABS.find((t) => t.key === searchParams.get('tab'))?.key || 'episodes'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    if (tab === 'episodes') url.searchParams.delete('tab')
    else url.searchParams.set('tab', tab)
    window.history.replaceState(null, '', url.toString())
  }

  const totalEpisodes = episodes.length

  return (
    <>
      <nav className="mt-6 flex gap-1 border-b border-border-default overflow-x-auto">
        {TABS.filter((tab) => tab.key !== 'share' || client).map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors -mb-px ${
              activeTab === tab.key
                ? 'text-accent-hover border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {activeTab === 'episodes' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium uppercase tracking-wider text-text-secondary">
                Episodes
                <span className="ml-2 text-sm font-normal">({totalEpisodes})</span>
              </h2>
              <div className="flex items-center gap-2">
                <BatchAiButton showId={show.id} />
                <StageManagerTrigger showId={show.id} stages={stages} />
                <QuickCreateEpisode showId={show.id} />
              </div>
            </div>

            {totalEpisodes === 0 ? (
              <p className="text-sm text-text-tertiary">
                No episodes yet. Create one to get started.
              </p>
            ) : (
              <PipelineBoard
                showId={show.id}
                stages={stages}
                episodes={episodes}
              />
            )}
          </section>
        )}

        {activeTab === 'assets' && (
          <ShowAssetsTab showId={show.id} />
        )}

        {activeTab === 'share' && client && (
          <div className="max-w-sm">
            <ClientPortalSection
              clientId={client.id}
              clientName={client.name}
              clientEmail={client.email}
              inviteCode={client.invite_code}
              onboardedAt={client.onboarded_at}
            />
          </div>
        )}

        {activeTab === 'details' && (
          <div className="max-w-lg">
            <ShowDetailsTab
              showId={show.id}
              defaultValues={{
                name: show.name || '',
                description: show.description || '',
                format: show.format || '',
                schedule: show.schedule || '',
              }}
              coverArtUrl={show.cover_art_url}
              clientId={show.client_id || ''}
              allowClientDownloads={show.allow_client_downloads}
            />
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="max-w-lg">
            <ShowTemplatesTab showId={show.id} initialNotes={show.episode_template?.notes || ''} />
          </div>
        )}

        {activeTab === 'distribution' && (
          <div className="max-w-lg">
            <DistributionSettings showId={show.id} />
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="max-w-lg">
            <ShowAiSettings
              showId={show.id}
              autoTranscribe={show.ai_auto_transcribe !== false}
              autoGenerate={show.ai_auto_generate || [...ALL_GENERATION_TYPES]}
              tone={show.ai_tone}
              length={show.ai_length}
            />
          </div>
        )}
      </div>
    </>
  )
}
