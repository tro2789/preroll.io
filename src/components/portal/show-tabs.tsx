'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ReviewQueue } from './review-queue'
import { ActivityFeed } from './activity-feed'

interface ReviewDeliverable {
  id: string
  type: string
  title: string
  description: string | null
  file_url: string | null
  status: string
  reviewer_notes: string | null
  reviewed_at: string | null
  created_at: string
  producer_notes?: string | null
  episode_title: string | null
  episode_number: number | null
  reviewUrl?: string
  thumbnailUrl?: string
}

interface Stage {
  id: string
  name: string
  position: number
}

interface Episode {
  id: string
  title: string
  episode_number: number | null
  status: string
  stage_id: string | null
  scheduled_publish_date: string | null
  pendingCount: number
}

interface Activity {
  id: string
  action: string
  description: string
  created_at: string
}

interface Asset {
  id: string
  name: string
  assetType: string
  mimeType: string | null
}

interface ShowTabsProps {
  showId: string
  reviewItems: ReviewDeliverable[]
  allowDownload: boolean
  episodes: Episode[]
  stages: Stage[]
  activities: Activity[]
  assets: Asset[]
}

type Tab = 'review' | 'episodes' | 'assets' | 'activity'

const assetTypeLabels: Record<string, string> = {
  cover_art: 'Cover Art',
  intro: 'Intro',
  outro: 'Outro',
  music_bed: 'Music Bed',
  thumbnail: 'Thumbnail',
  show_notes: 'Show Notes',
  clip: 'Clip',
  other: 'Other',
}

export function ShowTabs({ showId, reviewItems, allowDownload, episodes, stages, activities, assets }: ShowTabsProps) {
  const [active, setActive] = useState<Tab>(reviewItems.length > 0 ? 'review' : 'episodes')

  const sortedStages = [...stages].sort((a, b) => a.position - b.position)
  const episodesByStage = new Map<string, Episode[]>()
  for (const ep of episodes) {
    if (ep.stage_id) {
      const list = episodesByStage.get(ep.stage_id) || []
      list.push(ep)
      episodesByStage.set(ep.stage_id, list)
    }
  }
  const activeStages = sortedStages.filter((s) => (episodesByStage.get(s.id) || []).length > 0)

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'review', label: 'Needs Review', count: reviewItems.length || undefined },
    { id: 'episodes', label: 'Episodes', count: episodes.length || undefined },
    { id: 'assets', label: 'Brand Assets', count: assets.length || undefined },
    { id: 'activity', label: 'Activity' },
  ]

  return (
    <div>
      <div className="flex gap-0.5 border-b border-border-subtle mb-5 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`shrink-0 px-3 py-2.5 transition-colors -mb-px ${
              active === tab.id
                ? 'text-[13px] font-medium text-text-primary border-b-2 border-accent'
                : 'text-[13px] font-[450] text-text-secondary border-b-2 border-transparent hover:text-text-primary'
            }`}
          >
            {tab.label}
            {tab.count != null && (
              <span className="font-mono text-[11px] text-fg-faint ml-1.5">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {active === 'review' && (
        <ReviewQueue deliverables={reviewItems} allowDownload={allowDownload} />
      )}

      {active === 'episodes' && (
        <div>
          {episodes.length === 0 ? (
            <div className="rounded-lg border border-border-subtle bg-surface-raised/50 px-4 py-10 text-center">
              <p className="text-sm text-text-secondary">No episodes yet.</p>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(activeStages.length, 4)}, minmax(0, 1fr))` }}>
              {activeStages.map((stage) => {
                const stageEps = episodesByStage.get(stage.id) || []
                return (
                  <div key={stage.id} className="min-w-0">
                    <div className="flex items-center justify-between mb-2.5 px-1">
                      <h3 className="text-sm font-semibold text-text-primary">{stage.name}</h3>
                      <span className="text-sm text-text-secondary">{stageEps.length}</span>
                    </div>
                    <div className="space-y-2">
                      {stageEps.map((ep) => (
                          <Link
                            key={ep.id}
                            href={`/portal/shows/${showId}/episodes/${ep.id}`}
                            className="block rounded-lg border border-border-subtle bg-surface-raised p-3 hover:border-border-default transition-colors"
                          >
                            <p className="text-sm font-medium text-text-primary leading-snug line-clamp-1">
                              {ep.title}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                              {ep.episode_number != null && (
                                <span className="font-mono">#{ep.episode_number}</span>
                              )}
                              {ep.scheduled_publish_date && (
                                <span>{new Date(ep.scheduled_publish_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              )}
                            </div>
                            {ep.pendingCount > 0 && (
                              <span className="mt-1.5 inline-block text-sm font-medium text-accent">
                                {ep.pendingCount} to review
                              </span>
                            )}
                          </Link>
                        ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {active === 'assets' && (
        <div>
          {assets.length === 0 ? (
            <div className="rounded-lg border border-border-subtle bg-surface-raised/50 px-4 py-10 text-center">
              <p className="text-sm text-text-secondary">No brand assets yet.</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {assets.map((asset) => (
                <div key={asset.id} className="rounded-lg bg-surface-raised border border-border-subtle p-3.5 flex items-center gap-3">
                  <div className="shrink-0 w-9 h-9 rounded bg-surface-overlay flex items-center justify-center">
                    <span className="text-xs font-semibold text-text-secondary uppercase">
                      {asset.mimeType?.split('/')[1]?.slice(0, 3) || '?'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">{asset.name}</p>
                    <p className="text-sm text-text-secondary">{assetTypeLabels[asset.assetType] || asset.assetType}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {active === 'activity' && (
        <div className="rounded-lg bg-surface-raised border border-border-subtle p-4">
          <ActivityFeed activities={activities} />
        </div>
      )}
    </div>
  )
}
