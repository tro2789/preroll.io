'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReviewQueue } from './review-queue'
import { ActivityFeed } from './activity-feed'
import { PortalKanban } from './portal-kanban'
import { EpisodeSubmitForm } from './episode-submit-form'

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
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const router = useRouter()

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'review', label: 'Needs Review', count: reviewItems.length || undefined },
    { id: 'episodes', label: 'Episodes', count: episodes.length || undefined },
    { id: 'assets', label: 'Brand Assets', count: assets.length || undefined },
    { id: 'activity', label: 'Activity' },
  ]

  return (
    <div>
      <div className="flex items-center border-b border-border-subtle mb-5">
        <div className="flex gap-0.5 overflow-x-auto overflow-y-hidden flex-1">
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
        <button
          onClick={() => setShowSubmitForm(true)}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors ml-3 mb-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          Submit Episode
        </button>
      </div>

      {active === 'review' && (
        <ReviewQueue deliverables={reviewItems} allowDownload={allowDownload} />
      )}

      {active === 'episodes' && (
        <PortalKanban showId={showId} episodes={episodes} stages={stages} />
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

      {showSubmitForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg">
            <EpisodeSubmitForm
              showId={showId}
              onSuccess={() => {
                setShowSubmitForm(false)
                router.refresh()
              }}
              onCancel={() => setShowSubmitForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
