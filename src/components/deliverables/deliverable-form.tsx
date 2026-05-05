'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FilePickerModal } from '@/components/integrations/file-picker-modal'

interface DeliverableFormProps {
  showId: string
  episodeId?: string
  onClose: () => void
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

export function DeliverableForm({ showId, episodeId, onClose }: DeliverableFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [type, setType] = useState('other')
  const [description, setDescription] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasFrameIo, setHasFrameIo] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    fetch('/api/v1/integrations')
      .then((res) => res.json())
      .then((json) => {
        const connected = (json.data || []).some((i: { provider: string }) => i.provider === 'frame_io')
        setHasFrameIo(connected)
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/v1/deliverables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        show_id: showId,
        episode_id: episodeId || null,
        type,
        title,
        description: description || null,
        file_url: fileUrl || null,
      }),
    })

    if (!res.ok) {
      const json = await res.json()
      setError(json.error || 'Failed to create deliverable')
      setLoading(false)
      return
    }

    setLoading(false)
    onClose()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-accent/30 bg-surface-raised p-4 space-y-4">
      <h3 className="text-sm font-medium text-text-primary">Submit for Client Review</h3>

      {error && (
        <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <label htmlFor="del-type" className="block text-xs font-medium text-text-secondary mb-1">
            Type
          </label>
          <select
            id="del-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            {deliverableTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="del-url" className="block text-xs font-medium text-text-secondary">
            File URL
          </label>
          {hasFrameIo && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-xs text-accent hover:text-accent-hover transition-colors"
            >
              Browse Frame.io
            </button>
          )}
        </div>
        <input
          id="del-url"
          type="url"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          placeholder="https://..."
        />
      </div>

      <FilePickerModal
        provider="frame_io"
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(item) => {
          setFileUrl(item.viewUrl || `https://app.frame.io/player/${item.id}`)
          if (!title) setTitle(item.name)
        }}
      />

      <div>
        <label htmlFor="del-desc" className="block text-xs font-medium text-text-secondary mb-1">
          Description
        </label>
        <textarea
          id="del-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none resize-none"
          placeholder="Notes for the client..."
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit for Review'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
