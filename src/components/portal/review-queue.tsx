'use client'

import { useState } from 'react'
import { DeliverableCard } from './deliverable-card'
import { TYPE_LABELS } from '@/lib/constants/deliverables'

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

type ViewMode = 'table' | 'cards'

const statusConfig: Record<string, { dot: string; label: string }> = {
  pending: { dot: 'bg-amber-400', label: 'Pending Review' },
  approved: { dot: 'bg-emerald-400', label: 'Approved' },
  revision_requested: { dot: 'bg-red-400', label: 'Revision Requested' },
}

const btnSecondary = 'inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface-overlay px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-surface-input transition-colors'

function formatEpisodeContext(d: ReviewDeliverable): string {
  if (d.episode_number) return `Ep ${d.episode_number} — ${d.episode_title}`
  return d.episode_title || ''
}

export function ReviewQueue({ deliverables, allowDownload }: ReviewQueueProps) {
  const [view, setView] = useState<ViewMode>('table')

  if (deliverables.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-raised/50 px-4 py-10 text-center">
        <p className="text-sm font-medium text-text-primary">You're all caught up</p>
        <p className="text-sm text-text-secondary mt-1">Deliverables needing your review will appear here.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <div className="flex rounded-md border border-border-subtle overflow-hidden">
          <button
            onClick={() => setView('table')}
            title="Table view"
            className={`p-1.5 transition-colors ${
              view === 'table'
                ? 'bg-surface-overlay text-text-primary'
                : 'bg-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.166a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setView('cards')}
            title="Card view"
            className={`p-1.5 transition-colors ${
              view === 'cards'
                ? 'bg-surface-overlay text-text-primary'
                : 'bg-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm9-9A2.25 2.25 0 0011 4.25v2.5A2.25 2.25 0 0013.25 9h2.5A2.25 2.25 0 0018 6.75v-2.5A2.25 2.25 0 0015.75 2h-2.5zm0 9A2.25 2.25 0 0011 13.25v2.5A2.25 2.25 0 0013.25 18h2.5A2.25 2.25 0 0018 15.75v-2.5A2.25 2.25 0 0015.75 11h-2.5z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {view === 'table' ? (
        <div className="rounded-lg border border-border-subtle overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-overlay/50">
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-2.5">Episode</th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-2.5">File</th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-2.5">Type</th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-2.5">Status</th>
                <th className="text-right text-xs font-medium text-text-secondary px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliverables.map((d, i) => {
                const status = statusConfig[d.status] || statusConfig.pending
                return (
                  <tr
                    key={d.id}
                    className={`${
                      i < deliverables.length - 1 ? 'border-b border-border-subtle' : ''
                    } bg-surface-raised hover:bg-surface-overlay/30 transition-colors`}
                  >
                    <td className="px-4 py-3 text-sm text-text-secondary max-w-[200px]">
                      <span className="truncate block">{formatEpisodeContext(d)}</span>
                    </td>
                    <td className="px-4 py-3 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{d.title}</p>
                      {d.producer_notes && (
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{d.producer_notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-secondary whitespace-nowrap">
                        {TYPE_LABELS[d.type] || d.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {d.reviewUrl && (
                          <a href={d.reviewUrl} className={btnSecondary}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                              <path d="M3.05 3.05a7 7 0 1 1 9.9 9.9 7 7 0 0 1-9.9-9.9Zm1.627 8.273A5.5 5.5 0 1 0 12.323 4.677L4.677 12.323ZM6.75 6a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.105.66l2.255-1.25a.75.75 0 0 0 0-1.32l-2.255-1.25A.75.75 0 0 0 6.75 6Z" />
                            </svg>
                            Review
                          </a>
                        )}
                        {allowDownload && d.file_url && (
                          <a href={`/api/v1/deliverables/${d.id}/download`} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                              <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14H2.75Z" />
                              <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z" />
                            </svg>
                            Download
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {deliverables.map((d) => {
            const episodeContext = d.episode_number
              ? `Ep ${d.episode_number} — ${d.episode_title}`
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
      )}
    </div>
  )
}
