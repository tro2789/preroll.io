'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PipelineBoard } from '@/components/episodes/pipeline-board'
import { ThumbnailUpload } from '@/components/ui/thumbnail-upload'
import { ShowDetailsTab } from '@/components/shows/show-details-tab'
import { ShowAssetsTab } from '@/components/shows/show-assets-tab'
import { ShowTemplatesTab } from '@/components/shows/show-templates-tab'
import { ClientPortalSection } from '@/components/client-portal-section'
import { DistributionSettings } from '@/components/shows/distribution-settings'
import { AnalyticsSettings } from '@/components/shows/analytics-settings'
import { ShowAiSettings } from '@/components/shows/show-ai-settings'
import { PublishedEpisodesTab } from '@/components/shows/published-episodes-tab'
import { ALL_GENERATION_TYPES } from '@/lib/ai/constants'

const TABS = [
  { key: 'episodes', label: 'Episodes' },
  { key: 'published', label: 'Published' },
  { key: 'assets', label: 'Assets' },
  { key: 'share', label: 'Share' },
  { key: 'details', label: 'Details' },
  { key: 'templates', label: 'Templates' },
  { key: 'distribution', label: 'Distribution' },
  { key: 'analytics', label: 'Analytics' },
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
  analytics_milestones: { downloads: number }[] | null
}

interface ClientData {
  id: string
  name: string
  email: string | null
  invite_code: string | null
  client_user_id: string | null
  onboarded_at: string | null
}

export interface PublishedEpisode {
  id: string
  title: string
  episode_number: number | null
  status: string
  scheduled_publish_date: string | null
  published_at: string | null
  image_url: string | null
  show_id: string
}

interface ShowTabsProps {
  show: ShowData
  client: ClientData | null
  stages: Stage[]
  episodes: Episode[]
  publishedEpisodes: PublishedEpisode[]
  resolvedCoverArtUrl: string | null
}

export function ShowTabs({ show, client, stages, episodes, publishedEpisodes, resolvedCoverArtUrl }: ShowTabsProps) {
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

  async function handleCoverArtUploaded(fileKey: string) {
    await fetch(`/api/v1/shows/${show.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_art_url: fileKey }),
    })
  }

  return (
    <>
      <div className="mt-2 flex items-start gap-4">
        <ThumbnailUpload
          id={show.id}
          imageUrl={resolvedCoverArtUrl}
          showId={show.id}
          onUploaded={handleCoverArtUploaded}
          aspect="square"
          className="w-20 h-20 sm:w-14 sm:h-14 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-text-primary leading-tight">{show.name}</h1>
          {show.description && (
            <p className="mt-1 text-sm text-text-secondary leading-relaxed line-clamp-2">{show.description}</p>
          )}
        </div>
      </div>

      <nav className="mt-6 flex gap-1 border-b border-border-default overflow-x-auto overflow-y-hidden">
        {TABS.filter((tab) => {
          if (tab.key === 'share') return !!client
          if (tab.key === 'published') return publishedEpisodes.length > 0
          return true
        }).map((tab) => (
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

        {activeTab === 'published' && (
          <PublishedEpisodesTab showId={show.id} episodes={publishedEpisodes} />
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

        {activeTab === 'analytics' && (
          <div className="max-w-lg">
            <AnalyticsSettings showId={show.id} initialMilestones={show.analytics_milestones?.map((m) => m.downloads)} />
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
