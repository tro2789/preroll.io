'use client'

import { useState, useEffect } from 'react'
import { TYPE_LABELS } from '@/lib/constants/deliverables'
import { VersionPickerModal } from '@/components/portal/version-picker-modal'

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
  producer_notes?: string | null
}

interface DeliverableCardProps {
  deliverable: Deliverable
  episodeContext?: string
  reviewUrl?: string
  thumbnailUrl?: string
  allowDownload?: boolean
  versionCount?: number
}

const statusConfig: Record<string, { dot: string; bg: string; label: string }> = {
  pending: { dot: 'bg-amber-400', bg: 'bg-amber-500/15 text-amber-400', label: 'Pending Review' },
  approved: { dot: 'bg-emerald-400', bg: 'bg-emerald-500/15 text-emerald-400', label: 'Approved' },
  revision_requested: { dot: 'bg-red-400', bg: 'bg-red-500/15 text-red-400', label: 'Revision Requested' },
}

const btnSecondary = 'inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-input transition-colors disabled:opacity-50'

export function DeliverableCard({ deliverable, episodeContext, reviewUrl, thumbnailUrl: initialThumb, allowDownload, versionCount }: DeliverableCardProps) {
  const [thumb, setThumb] = useState(initialThumb)
  const [thumbFailed, setThumbFailed] = useState(false)
  const [showVersionPicker, setShowVersionPicker] = useState(false)

  useEffect(() => {
    if (initialThumb || thumbFailed || !reviewUrl) return
    let cancelled = false
    fetch(`/api/v1/deliverables/${deliverable.id}/thumbnail`)
      .then((r) => r.json())
      .then((json) => {
        const url = json.data?.url
        if (!cancelled && url) setThumb(url)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [deliverable.id, initialThumb, reviewUrl, thumbFailed])

  const status = statusConfig[deliverable.status] || statusConfig.pending

  return (
    <div className="rounded-lg bg-surface-raised border border-border-subtle overflow-hidden">
      <div className="flex gap-3 p-3">
        {thumb && !thumbFailed ? (
          <a
            href={reviewUrl || '#'}
            className="shrink-0 relative w-28 aspect-video rounded-md overflow-hidden group/thumb"
          >
            <img src={thumb} alt="" className="h-full w-full object-cover" onError={() => setThumbFailed(true)} />
            {reviewUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            {versionCount != null && versionCount > 1 && (
              <span
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowVersionPicker(true) }}
                className="absolute top-1 right-1 rounded bg-surface-raised/90 px-1 py-0.5 text-xs font-medium text-text-secondary backdrop-blur-sm cursor-pointer hover:bg-surface-raised hover:text-text-primary transition-colors"
              >
                v{versionCount}
              </span>
            )}
          </a>
        ) : null}

        <div className="min-w-0 flex-1 flex flex-col justify-between">
          <div>
            {episodeContext && (
              <p className="text-xs text-text-secondary mb-0.5">{episodeContext}</p>
            )}
            <h3 className="text-sm font-medium text-text-primary truncate">{deliverable.title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-text-secondary">{TYPE_LABELS[deliverable.type] || deliverable.type}</span>
              <span className="text-text-tertiary">&middot;</span>
              <span className={`inline-flex items-center gap-1 text-xs`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
              {versionCount != null && versionCount > 1 && !thumb && (
                <>
                  <span className="text-text-tertiary">&middot;</span>
                  <button
                    onClick={() => setShowVersionPicker(true)}
                    className="text-xs text-text-secondary hover:text-accent transition-colors"
                  >
                    {versionCount} versions
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            {reviewUrl && (
              <a href={reviewUrl} className={btnSecondary}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path d="M3.05 3.05a7 7 0 1 1 9.9 9.9 7 7 0 0 1-9.9-9.9Zm1.627 8.273A5.5 5.5 0 1 0 12.323 4.677L4.677 12.323ZM6.75 6a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.105.66l2.255-1.25a.75.75 0 0 0 0-1.32l-2.255-1.25A.75.75 0 0 0 6.75 6Z" />
                </svg>
                Review
              </a>
            )}
            {allowDownload && deliverable.file_url && (
              <a href={`/api/v1/deliverables/${deliverable.id}/download`} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14H2.75Z" />
                  <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z" />
                </svg>
                Download
              </a>
            )}
          </div>
        </div>
      </div>

      {deliverable.producer_notes && (
        <div className="mx-3 mb-3 rounded-md bg-accent/5 border border-accent/15 px-3 py-2">
          <p className="text-xs font-medium text-text-secondary mb-0.5">Producer notes</p>
          <p className="text-xs text-text-secondary whitespace-pre-wrap">{deliverable.producer_notes}</p>
        </div>
      )}

      {showVersionPicker && reviewUrl && (
        <VersionPickerModal
          fetchUrl={`/api/v1/portal/deliverables/${deliverable.id}/versions`}
          reviewBaseUrl={reviewUrl}
          onClose={() => setShowVersionPicker(false)}
        />
      )}
    </div>
  )
}
