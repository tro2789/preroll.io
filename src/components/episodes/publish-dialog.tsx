'use client'

import { useState } from 'react'

interface PublishDialogProps {
  showId: string
  episodeId: string
  episode: {
    title: string
    episode_number: number | null
    description: string | null
    scheduled_publish_date: string | null
  }
  deliverables: { id: string; title: string; type: string }[]
  isOpen: boolean
  onClose: () => void
}

export function PublishDialog({
  showId,
  episodeId,
  episode,
  deliverables,
  isOpen,
  onClose,
}: PublishDialogProps) {
  const [audioSource, setAudioSource] = useState(
    deliverables.length > 0 ? `deliverable:${deliverables[0].id}` : ''
  )
  const [title, setTitle] = useState(episode.title)
  const [description, setDescription] = useState(episode.description || '')
  const [episodeNumber, setEpisodeNumber] = useState<number | null>(episode.episode_number)
  const [seasonNumber, setSeasonNumber] = useState<number | null>(null)
  const [episodeType, setEpisodeType] = useState('full')
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now')
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (episode.scheduled_publish_date) {
      return `${episode.scheduled_publish_date}T12:00`
    }
    return ''
  })
  const [customUrl, setCustomUrl] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ share_url?: string } | null>(null)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPublishing(true)
    setError(null)

    const resolvedAudioSource = audioSource === 'url:custom'
      ? `url:${customUrl}`
      : audioSource

    try {
      const res = await fetch(`/api/v1/shows/${showId}/episodes/${episodeId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          episode_number: episodeNumber,
          season_number: seasonNumber,
          episode_type: episodeType,
          scheduled_at: publishMode === 'schedule' ? scheduledAt : undefined,
          audio_source: resolvedAudioSource,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Publish failed (${res.status})`)
      }

      const json = await res.json()
      setResult(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPublishing(false)
    }
  }

  const inputClasses =
    'w-full rounded-md bg-surface-input border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-surface-base border border-border-subtle rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Publish to Transistor</h2>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-secondary transition-colors p-1"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {result ? (
          /* Success state */
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
              <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-text-primary">
              {publishMode === 'schedule' ? 'Scheduled!' : 'Published!'}
            </p>
            {result.share_url && (
              <a
                href={result.share_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-accent hover:text-accent-hover transition-colors"
              >
                View on Transistor &rarr;
              </a>
            )}
            <div className="pt-2">
              <button
                onClick={onClose}
                className="rounded-md bg-surface-overlay border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-hover"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Audio Source */}
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Audio Source</label>
              <select
                value={audioSource}
                onChange={(e) => setAudioSource(e.target.value)}
                className={inputClasses}
              >
                {deliverables.map((d) => (
                  <option key={d.id} value={`deliverable:${d.id}`}>
                    {d.title} ({d.type})
                  </option>
                ))}
                <option value="url:custom">Custom URL</option>
              </select>
              {audioSource === 'url:custom' && (
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                  className={`${inputClasses} mt-2`}
                  required
                />
              )}
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClasses}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={inputClasses}
              />
            </div>

            {/* Episode Number + Season Number */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-text-secondary">Episode Number</label>
                <input
                  type="number"
                  value={episodeNumber ?? ''}
                  onChange={(e) =>
                    setEpisodeNumber(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  className={inputClasses}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-secondary">Season Number</label>
                <input
                  type="number"
                  value={seasonNumber ?? ''}
                  onChange={(e) =>
                    setSeasonNumber(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  className={inputClasses}
                />
              </div>
            </div>

            {/* Episode Type */}
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Episode Type</label>
              <select
                value={episodeType}
                onChange={(e) => setEpisodeType(e.target.value)}
                className={inputClasses}
              >
                <option value="full">Full</option>
                <option value="trailer">Trailer</option>
                <option value="bonus">Bonus</option>
              </select>
            </div>

            {/* Publish Mode Toggle */}
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">When to Publish</label>
              <div className="flex rounded-md border border-border-default overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPublishMode('now')}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    publishMode === 'now'
                      ? 'bg-accent text-white'
                      : 'bg-surface-input text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Now
                </button>
                <button
                  type="button"
                  onClick={() => setPublishMode('schedule')}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    publishMode === 'schedule'
                      ? 'bg-accent text-white'
                      : 'bg-surface-input text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Schedule
                </button>
              </div>
            </div>

            {/* Schedule Date/Time */}
            {publishMode === 'schedule' && (
              <div className="space-y-1">
                <label className="text-xs text-text-secondary">Scheduled Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className={inputClasses}
                  required
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={publishing}
              className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishing
                ? 'Publishing...'
                : publishMode === 'schedule'
                  ? 'Schedule'
                  : 'Publish Now'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
