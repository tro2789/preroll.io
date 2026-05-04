'use client'

import { useState } from 'react'
import { DeliverableForm } from './deliverable-form'
import { DeliverableList } from './deliverable-list'

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

interface EpisodeDeliverablesProps {
  showId: string
  episodeId: string
  deliverables: Deliverable[]
}

export function EpisodeDeliverables({ showId, episodeId, deliverables }: EpisodeDeliverablesProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Client Deliverables
          {deliverables.length > 0 && (
            <span className="ml-1 normal-case tracking-normal">({deliverables.length})</span>
          )}
        </h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-accent hover:text-accent-hover transition-colors font-medium"
          >
            + Submit for Review
          </button>
        )}
      </div>

      {showForm && (
        <DeliverableForm
          showId={showId}
          episodeId={episodeId}
          onClose={() => setShowForm(false)}
        />
      )}

      <DeliverableList deliverables={deliverables} />

      {deliverables.length === 0 && !showForm && (
        <p className="text-xs text-text-tertiary text-center py-2">
          No deliverables submitted yet.
        </p>
      )}
    </div>
  )
}
