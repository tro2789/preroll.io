'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DeliverableList } from '@/components/deliverables/deliverable-list'

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

const deliverableTypes = [
  { value: 'rough_cut', label: 'Rough Cut' },
  { value: 'final_cut', label: 'Final Cut' },
  { value: 'thumbnail', label: 'Thumbnail' },
  { value: 'show_notes', label: 'Show Notes' },
  { value: 'cover_art', label: 'Cover Art' },
  { value: 'intro', label: 'Intro' },
  { value: 'outro', label: 'Outro' },
  { value: 'social_clip', label: 'Social Clip' },
  { value: 'other', label: 'Other' },
]

interface DeliverablesTabProps {
  episodeId: string
  showId: string
  deliverables: Deliverable[]
}

export function DeliverablesTab({ episodeId, showId, deliverables }: DeliverablesTabProps) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('rough_cut')
  const [fileUrl, setFileUrl] = useState('')
  const [producerNotes, setProducerNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          show_id: showId,
          episode_id: episodeId,
          type,
          title: title.trim(),
          file_url: fileUrl.trim() || null,
          producer_notes: producerNotes.trim() || null,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to create deliverable')
      }
      setTitle('')
      setType('rough_cut')
      setFileUrl('')
      setProducerNotes('')
      setShowForm(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const pending = deliverables.filter(d => d.status === 'pending')
  const approved = deliverables.filter(d => d.status === 'approved')
  const revisions = deliverables.filter(d => d.status === 'revision_requested')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-text-primary">
            Deliverables
          </h3>
          {deliverables.length > 0 && (
            <span className="text-xs text-text-tertiary">{deliverables.length} total</span>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md border border-border-subtle bg-surface-default px-3 py-1.5 text-xs font-medium text-text-primary hover:border-border-hover transition-colors"
          >
            Add Deliverable
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border-subtle bg-surface-raised p-4 space-y-3">
          {error && <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Title"
              className="rounded-md border border-border-subtle bg-surface-default px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-md border border-border-subtle bg-surface-default px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              {deliverableTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <input
            type="url"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="File URL (optional)"
            className="w-full rounded-md border border-border-subtle bg-surface-default px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
          <textarea
            value={producerNotes}
            onChange={(e) => setProducerNotes(e.target.value)}
            placeholder="Notes for client (optional)"
            rows={2}
            className="w-full rounded-md border border-border-subtle bg-surface-default px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null) }}
              className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {deliverables.length === 0 && !showForm && (
        <div className="py-12 text-center">
          <p className="text-sm text-text-tertiary">No deliverables yet.</p>
          <p className="mt-1 text-xs text-text-tertiary">Add a deliverable to share with your client for review.</p>
        </div>
      )}

      {revisions.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wider text-red-400 mb-2">Revisions Requested ({revisions.length})</h4>
          <DeliverableList deliverables={revisions} />
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wider text-amber-400 mb-2">Pending Review ({pending.length})</h4>
          <DeliverableList deliverables={pending} />
        </div>
      )}

      {approved.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wider text-emerald-400 mb-2">Approved ({approved.length})</h4>
          <DeliverableList deliverables={approved} />
        </div>
      )}
    </div>
  )
}
