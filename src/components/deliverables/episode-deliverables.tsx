'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DeliverableList } from './deliverable-list'
import { FilePickerModal } from '@/components/integrations/file-picker-modal'

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
  hasFrameIo: boolean
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

export function EpisodeDeliverables({ showId, episodeId, deliverables, hasFrameIo }: EpisodeDeliverablesProps) {
  const router = useRouter()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const [selectedType, setSelectedType] = useState('rough_cut')
  const [title, setTitle] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setTitle('')
    setFileUrl('')
    setDescription('')
    setSelectedType('rough_cut')
    setError(null)
    setShowManualForm(false)
  }

  async function submitDeliverable(name: string, type: string, url: string, externalId?: string, thumbnailUrl?: string, mimeType?: string) {
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
          title: name,
          file_url: url || null,
          mime_type: mimeType || null,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to share file')
      }

      const { data: deliverable } = await res.json()

      if (externalId) {
        await fetch('/api/v1/integrations/file-references', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'frame_io',
            external_id: externalId,
            name,
            episode_id: episodeId,
            deliverable_id: deliverable?.id || null,
            thumbnail_url: thumbnailUrl || null,
            mime_type: mimeType || null,
          }),
        })
      }

      router.refresh()
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleFrameIoSelect(item: { id: string; name: string; viewUrl?: string; thumbnailUrl?: string; mimeType?: string }) {
    await submitDeliverable(
      item.name,
      selectedType,
      item.viewUrl || `https://app.frame.io/player/${item.id}`,
      item.id,
      item.thumbnailUrl,
      item.mimeType,
    )
    setPickerOpen(false)
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    await submitDeliverable(title, selectedType, fileUrl)
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          Shared Files
          {deliverables.length > 0 && (
            <span className="ml-1 normal-case tracking-normal">({deliverables.length})</span>
          )}
        </h3>
        {!showManualForm && (
          <div className="flex items-center gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-md border border-border-default bg-surface-input px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
            >
              {deliverableTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {hasFrameIo && (
              <button
                onClick={() => setPickerOpen(true)}
                disabled={loading}
                className="text-xs text-accent hover:text-accent-hover transition-colors font-medium disabled:opacity-50"
              >
                + From Frame.io
              </button>
            )}
            <button
              onClick={() => setShowManualForm(true)}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors font-medium"
            >
              + Manual
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      {showManualForm && (
        <form onSubmit={handleManualSubmit} className="rounded-lg border border-accent/30 bg-surface-overlay p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="del-title" className="block text-xs font-medium text-text-secondary mb-1">
                Title
              </label>
              <input
                id="del-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                placeholder="Episode 5 Rough Cut"
              />
            </div>
            <div>
              <label htmlFor="del-url" className="block text-xs font-medium text-text-secondary mb-1">
                File URL
              </label>
              <input
                id="del-url"
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                placeholder="https://..."
              />
            </div>
          </div>
          <div>
            <label htmlFor="del-desc" className="block text-xs font-medium text-text-secondary mb-1">
              Notes for client
            </label>
            <textarea
              id="del-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {loading ? 'Sharing...' : 'Share for Review'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <DeliverableList deliverables={deliverables} />

      {deliverables.length === 0 && !showManualForm && (
        <p className="text-xs text-text-secondary text-center py-2">
          No files shared yet.
        </p>
      )}

      <FilePickerModal
        provider="frame_io"
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleFrameIoSelect}
      />
    </div>
  )
}
