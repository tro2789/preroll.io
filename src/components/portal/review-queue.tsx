'use client'

import { DeliverableCard } from './deliverable-card'

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

interface ReviewQueueProps {
  deliverables: ReviewDeliverable[]
  allowDownload?: boolean
}

export function ReviewQueue({ deliverables, allowDownload }: ReviewQueueProps) {
  if (deliverables.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-raised/50 px-4 py-10 text-center">
        <p className="text-sm font-medium text-text-primary">You're all caught up</p>
        <p className="text-sm text-text-secondary mt-1">Deliverables needing your review will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {deliverables.map((d) => {
        const episodeContext = d.episode_number
          ? `Episode ${d.episode_number} — ${d.episode_title}`
          : d.episode_title || undefined

        return (
          <DeliverableCard
            key={d.id}
            deliverable={d}
            episodeContext={episodeContext}
            reviewUrl={d.reviewUrl}
            thumbnailUrl={d.thumbnailUrl}
            allowDownload={allowDownload}
          />
        )
      })}
    </div>
  )
}
