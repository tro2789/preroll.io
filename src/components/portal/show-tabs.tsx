'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ReviewQueue } from './review-queue'
import { EpisodeTimeline } from './episode-timeline'
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

interface ShowTabsProps {
  showId: string
  reviewItems: ReviewDeliverable[]
  allowDownload: boolean
  episodes: Episode[]
  stages: Stage[]
  activities: Activity[]
}

type Tab = 'review' | 'episodes' | 'activity'

export function ShowTabs({ showId, reviewItems, allowDownload, episodes, stages, activities }: ShowTabsProps) {
  const [active, setActive] = useState<Tab>(reviewItems.length > 0 ? 'review' : 'episodes')

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'review', label: 'Needs Review', count: reviewItems.length || undefined },
    { id: 'episodes', label: 'Episodes', count: episodes.length || undefined },
    { id: 'activity', label: 'Activity' },
  ]

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-border-subtle mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`relative px-3 py-2 text-sm font-medium transition-colors ${
              active === tab.id
                ? 'text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
            {tab.count != null && (
              <span className={`ml-1.5 text-xs ${active === tab.id ? 'text-accent' : 'text-text-tertiary'}`}>
                {tab.count}
              </span>
            )}
            {active === tab.id && (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-accent rounded-full" />
            )}
          </button>
        ))}
        <div className="flex-1" />
        {active === 'episodes' && (
          <Link
            href={`/portal/shows/${showId}/assets`}
            className="text-xs text-accent hover:text-accent-hover transition-colors pb-2"
          >
            Brand assets
          </Link>
        )}
      </div>

      {active === 'review' && (
        <ReviewQueue deliverables={reviewItems} allowDownload={allowDownload} />
      )}

      {active === 'episodes' && (
        <EpisodeTimeline episodes={episodes} stages={stages} showId={showId} />
      )}

      {active === 'activity' && (
        <div className="rounded-lg bg-surface-raised border border-border-subtle p-4">
          <ActivityFeed activities={activities} />
        </div>
      )}
    </div>
  )
}
