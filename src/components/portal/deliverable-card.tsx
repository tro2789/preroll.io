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

const statusConfig: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  pending: { dot: 'bg-amber-400', bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Pending Review' },
  approved: { dot: 'bg-emerald-400', bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Approved' },
  revision_requested: { dot: 'bg-red-400', bg: 'bg-red-500/15', text: 'text-red-400', label: 'Revision Requested' },
}

const btnSecondary = 'inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-input transition-colors disabled:opacity-50'

function getGradient(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  const h1 = Math.abs(hash % 360)
  const h2 = (h1 + 40) % 360
  return `linear-gradient(135deg, oklch(0.55 0.15 ${h1}), oklch(0.45 0.12 ${h2}))`
}

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
  const createdDate = new Date(deliverable.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-overlay overflow-hidden">
      <a
        href={reviewUrl || '#'}
        className="block relative aspect-video overflow-hidden"
      >
        {thumb && !thumbFailed ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" onError={() => setThumbFailed(true)} />
        ) : (
          <div className="h-full w-full" style={{ background: getGradient(deliverable.id) }} />
        )}

        {reviewUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        <span className={`absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.bg} ${status.text}`}>
          {status.label}
        </span>

        {versionCount != null && versionCount > 1 && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowVersionPicker(true) }}
            className="absolute top-1.5 right-1.5 rounded bg-surface-raised/90 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary backdrop-blur-sm hover:bg-surface-raised hover:text-text-primary transition-colors"
          >
            v{versionCount}
          </button>
        )}
      </a>

      <div className="p-2.5 space-y-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate" title={deliverable.title}>
            {deliverable.title}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-text-secondary">
            <span>{TYPE_LABELS[deliverable.type] || deliverable.type}</span>
            <span>&middot; {createdDate}</span>
            {episodeContext && (
              <>
                <span>&middot;</span>
                <span className="truncate">{episodeContext}</span>
              </>
            )}
          </div>
        </div>

        {deliverable.producer_notes && (
          <div className="rounded-md bg-accent/5 border border-accent/15 px-2.5 py-1.5">
            <p className="text-xs text-text-secondary whitespace-pre-wrap">{deliverable.producer_notes}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
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
