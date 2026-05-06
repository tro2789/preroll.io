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

interface DeliverableCardProps {
  deliverable: Deliverable
  episodeContext?: string
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
  pending: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Pending Review' },
  approved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Approved' },
  revision_requested: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Revision Requested' },
}

export function DeliverableCard({ deliverable, episodeContext }: DeliverableCardProps) {
  const router = useRouter()
  const [showRevisionForm, setShowRevisionForm] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const style = statusStyles[deliverable.status] || statusStyles.pending

  async function handleAction(status: 'approved' | 'revision_requested') {
    setLoading(true)
    await fetch(`/api/v1/deliverables/${deliverable.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        reviewer_notes: status === 'revision_requested' ? notes : null,
      }),
    })
    setLoading(false)
    setShowRevisionForm(false)
    router.refresh()
  }

  return (
    <div className="rounded-lg bg-surface-raised border border-border-subtle p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary">{typeLabels[deliverable.type] || deliverable.type}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
              {style.label}
            </span>
          </div>
          {episodeContext && (
            <p className="text-[11px] text-text-tertiary mt-1">{episodeContext}</p>
          )}
          <h3 className="text-sm font-medium text-text-primary mt-1">{deliverable.title}</h3>
          {deliverable.description && (
            <p className="text-xs text-text-secondary mt-1">{deliverable.description}</p>
          )}
        </div>

        {deliverable.file_url && (
          <a
            href={deliverable.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            View file
          </a>
        )}
      </div>

      {deliverable.status === 'approved' && deliverable.reviewed_at && (
        <p className="text-xs text-emerald-400">
          Approved {new Date(deliverable.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}

      {deliverable.status === 'revision_requested' && deliverable.reviewer_notes && (
        <div className="rounded-md bg-red-500/5 border border-red-500/20 px-3 py-2">
          <p className="text-xs text-text-secondary">{deliverable.reviewer_notes}</p>
        </div>
      )}

      {deliverable.status === 'pending' && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => handleAction('approved')}
            disabled={loading}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => setShowRevisionForm(!showRevisionForm)}
            disabled={loading}
            className="rounded-md bg-surface-input border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            Request Revision
          </button>
        </div>
      )}

      {showRevisionForm && (
        <div className="space-y-2 pt-1">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What needs to change?"
            rows={3}
            className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleAction('revision_requested')}
              disabled={loading || !notes.trim()}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Submit revision request'}
            </button>
            <button
              onClick={() => { setShowRevisionForm(false); setNotes('') }}
              className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
