'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

interface DeliverableListProps {
  deliverables: Deliverable[]
  reviewBaseUrl?: string
  reviewableIds?: Set<string>
}

const typeLabels: Record<string, string> = {
  rough_cut: 'Rough Cut',
  final_cut: 'Final Cut',
  thumbnail: 'Thumbnail',
  show_notes: 'Show Notes',
  cover_art: 'Cover Art',
  intro: 'Intro',
  outro: 'Outro',
  social_clip: 'Social Clip',
  other: 'Other',
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Pending' },
  approved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Approved' },
  revision_requested: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Needs Revision' },
}

export function DeliverableList({ deliverables, reviewBaseUrl, reviewableIds }: DeliverableListProps) {
  const router = useRouter()
  const [resubmitting, setResubmitting] = useState<string | null>(null)

  async function handleResubmit(id: string) {
    setResubmitting(id)
    await fetch(`/api/v1/deliverables/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending' }),
    })
    setResubmitting(null)
    router.refresh()
  }

  if (deliverables.length === 0) return null

  return (
    <div className="space-y-2">
      {deliverables.map((d) => {
        const style = statusStyles[d.status] || statusStyles.pending
        return (
          <div key={d.id} className="rounded-lg border border-border-subtle bg-surface-raised p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-tertiary">{typeLabels[d.type] || d.type}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                </div>
                <p className="text-sm font-medium text-text-primary mt-0.5">{d.title}</p>
              </div>
              {reviewBaseUrl && reviewableIds?.has(d.id) ? (
                <a
                  href={`${reviewBaseUrl}/${d.id}`}
                  className="shrink-0 text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  Review
                </a>
              ) : d.file_url ? (
                <a
                  href={d.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  View
                </a>
              ) : null}
            </div>

            {d.status === 'revision_requested' && d.reviewer_notes && (
              <div className="rounded-md bg-red-500/5 border border-red-500/20 px-3 py-2">
                <p className="text-xs text-text-tertiary mb-0.5">Client feedback:</p>
                <p className="text-xs text-text-secondary">{d.reviewer_notes}</p>
              </div>
            )}

            {d.status === 'revision_requested' && (
              <button
                onClick={() => handleResubmit(d.id)}
                disabled={resubmitting === d.id}
                className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {resubmitting === d.id ? 'Resubmitting...' : 'Resubmit for Review'}
              </button>
            )}

            {d.status === 'approved' && d.reviewed_at && (
              <p className="text-xs text-emerald-400">
                Approved {new Date(d.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
