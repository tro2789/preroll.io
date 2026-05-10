'use client'

import { useState } from 'react'

const YOUTUBE_CATEGORIES = [
  { id: '22', name: 'People & Blogs' },
  { id: '27', name: 'Education' },
  { id: '24', name: 'Entertainment' },
  { id: '28', name: 'Science & Technology' },
  { id: '25', name: 'News & Politics' },
  { id: '10', name: 'Music' },
  { id: '26', name: 'Howto & Style' },
  { id: '23', name: 'Comedy' },
]

const PROVIDER_NAMES: Record<string, string> = {
  transistor: 'Transistor',
  youtube: 'YouTube',
}

interface PublishDialogProps {
  showId: string
  episodeId: string
  provider: string
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
  provider,
  episode,
  deliverables,
  isOpen,
  onClose,
}: PublishDialogProps) {
  const isYouTube = provider === 'youtube'

  const [sourceValue, setSourceValue] = useState(
    deliverables.length > 0 ? `deliverable:${deliverables[0].id}` : ''
  )
  const [title, setTitle] = useState(episode.title)
  const [description, setDescription] = useState(episode.description || '')
  const [episodeNumber, setEpisodeNumber] = useState<number | null>(episode.episode_number)
  const [seasonNumber, setSeasonNumber] = useState<number | null>(null)
  const [episodeType, setEpisodeType] = useState('full')
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now')
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (episode.scheduled_publish_date) return `${episode.scheduled_publish_date}T12:00`
    return ''
  })
  const [customUrl, setCustomUrl] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ share_url?: string; view_url?: string } | null>(null)

  // YouTube-specific fields
  const [tags, setTags] = useState('')
  const [categoryId, setCategoryId] = useState('22')
  const [privacyStatus, setPrivacyStatus] = useState<'public' | 'unlisted' | 'private'>('public')

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPublishing(true)
    setError(null)

    const resolvedSource = sourceValue === 'url:custom'
      ? `url:${customUrl}`
      : sourceValue

    try {
      const bodyData: Record<string, unknown> = {
        provider,
        title,
        description,
        scheduled_at: publishMode === 'schedule' ? scheduledAt : undefined,
      }

      if (isYouTube) {
        bodyData.video_source = resolvedSource
        bodyData.tags = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : []
        bodyData.category_id = categoryId
        bodyData.privacy_status = privacyStatus
      } else {
        bodyData.audio_source = resolvedSource
        bodyData.episode_number = episodeNumber
        bodyData.season_number = seasonNumber
        bodyData.episode_type = episodeType
      }

      const res = await fetch(`/api/v1/shows/${showId}/episodes/${episodeId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
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

  const providerName = PROVIDER_NAMES[provider] || provider

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-surface-base border border-border-subtle rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Publish to {providerName}</h2>
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
              <a href={result.share_url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-accent hover:text-accent-hover transition-colors">
                View on Transistor &rarr;
              </a>
            )}
            {result.view_url && (
              <a href={result.view_url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-accent hover:text-accent-hover transition-colors">
                View on YouTube &rarr;
              </a>
            )}
            <div className="pt-2">
              <button onClick={onClose} className="rounded-md bg-surface-overlay border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-hover">
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">
                {isYouTube ? 'Video Source' : 'Audio Source'}
              </label>
              <select value={sourceValue} onChange={(e) => setSourceValue(e.target.value)} className={inputClasses}>
                {deliverables.map((d) => (
                  <option key={d.id} value={`deliverable:${d.id}`}>
                    {d.title} ({d.type})
                  </option>
                ))}
                <option value="url:custom">Custom URL</option>
              </select>
              {sourceValue === 'url:custom' && (
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder={isYouTube ? 'https://example.com/video.mp4' : 'https://example.com/audio.mp3'}
                  className={`${inputClasses} mt-2`}
                  required
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClasses} required />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClasses} />
            </div>

            {!isYouTube && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary">Episode Number</label>
                    <input type="number" value={episodeNumber ?? ''} onChange={(e) => setEpisodeNumber(e.target.value ? parseInt(e.target.value, 10) : null)} className={inputClasses} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary">Season Number</label>
                    <input type="number" value={seasonNumber ?? ''} onChange={(e) => setSeasonNumber(e.target.value ? parseInt(e.target.value, 10) : null)} className={inputClasses} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Episode Type</label>
                  <select value={episodeType} onChange={(e) => setEpisodeType(e.target.value)} className={inputClasses}>
                    <option value="full">Full</option>
                    <option value="trailer">Trailer</option>
                    <option value="bonus">Bonus</option>
                  </select>
                </div>
              </>
            )}

            {isYouTube && (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Tags (comma-separated)</label>
                  <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="podcast, tech, interview" className={inputClasses} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary">Category</label>
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClasses}>
                      {YOUTUBE_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary">Privacy</label>
                    <select value={privacyStatus} onChange={(e) => setPrivacyStatus(e.target.value as 'public' | 'unlisted' | 'private')} className={inputClasses}>
                      <option value="public">Public</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs text-text-secondary">When to Publish</label>
              <div className="flex rounded-md border border-border-default overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPublishMode('now')}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    publishMode === 'now' ? 'bg-accent text-white' : 'bg-surface-input text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Now
                </button>
                <button
                  type="button"
                  onClick={() => setPublishMode('schedule')}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    publishMode === 'schedule' ? 'bg-accent text-white' : 'bg-surface-input text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Schedule
                </button>
              </div>
            </div>

            {publishMode === 'schedule' && (
              <div className="space-y-1">
                <label className="text-xs text-text-secondary">Scheduled Date &amp; Time</label>
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputClasses} required />
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={publishing}
              className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishing
                ? 'Publishing...'
                : publishMode === 'schedule'
                  ? 'Schedule'
                  : `Publish to ${providerName}`}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
