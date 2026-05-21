'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { DISTRIBUTION_PROVIDER_NAMES } from '@/lib/integrations/types'

interface UploadState {
  resumableUrl: string
  downloadUrl: string
  mimeType: string
  fileSize: number
  showId: string
  episodeId: string
  title: string
  privacy_status: string
  scheduled_at?: string
  channel_id: string
  expiresAt: number
}

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
  fileReferences?: { id: string; name: string; mimeType: string; fileSize?: number; provider: string }[]
  isOpen: boolean
  onClose: () => void
}

export function PublishDialog({
  showId,
  episodeId,
  provider,
  episode,
  deliverables,
  fileReferences = [],
  isOpen,
  onClose,
}: PublishDialogProps) {
  const isYouTube = provider === 'youtube'
  const isAudioProvider = provider === 'transistor' || provider === 'castopod'

  const videoFiles = fileReferences.filter((f) => f.mimeType?.startsWith('video/'))
  const audioFiles = fileReferences.filter((f) => f.mimeType?.startsWith('audio/'))

  const sourceFiles = isYouTube ? videoFiles : audioFiles

  const defaultSource = isYouTube
    ? (videoFiles.length > 0 ? `file:${videoFiles[0].id}` : deliverables.length > 0 ? `deliverable:${deliverables[0].id}` : '')
    : (audioFiles.length > 0 ? `file:${audioFiles[0].id}` : '')

  const [sourceValue, setSourceValue] = useState(defaultSource)
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
  const [result, setResult] = useState<{ share_url?: string; view_url?: string } | null>(null)

  // YouTube-specific fields
  const [tags, setTags] = useState('')
  const [categoryId, setCategoryId] = useState('22')
  const [privacyStatus, setPrivacyStatus] = useState<'public' | 'unlisted' | 'private'>('public')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [pendingResume, setPendingResume] = useState<UploadState | null>(null)

  useEffect(() => {
    if (!isYouTube) return
    const stored = localStorage.getItem(`yt-upload:${episodeId}`)
    if (stored) {
      try {
        const state = JSON.parse(stored) as UploadState
        if (state.resumableUrl && Date.now() < state.expiresAt) {
          setPendingResume(state)
        } else {
          localStorage.removeItem(`yt-upload:${episodeId}`)
        }
      } catch {
        localStorage.removeItem(`yt-upload:${episodeId}`)
      }
    }
  }, [isYouTube, episodeId])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPublishing(true)

    const resolvedSource = sourceValue === 'url:custom'
      ? `url:${customUrl}`
      : sourceValue

    try {
      const bodyData: Record<string, unknown> = {
        provider,
        title,
        description,
        scheduled_at: publishMode === 'schedule' ? new Date(scheduledAt).toISOString() : undefined,
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
      const data = json.data

      if (data.mode === 'client_upload') {
        await handleClientUpload({ ...data, expiresAt: Date.now() + 24 * 60 * 60 * 1000 })
      } else {
        setResult(data)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPublishing(false)
      setUploadProgress(null)
    }
  }

  async function handleClientUpload(data: UploadState) {
    const state: UploadState = {
      ...data,
      expiresAt: data.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
    }
    localStorage.setItem(`yt-upload:${episodeId}`, JSON.stringify(state))
    setPendingResume(null)
    setUploadProgress(0)

    const offset = await queryResumableOffset(data.resumableUrl, data.fileSize)
    await streamToYouTube(data, offset)
  }

  async function handleResume() {
    if (!pendingResume) return
    setPublishing(true)
    setUploadProgress(0)
    try {
      await handleClientUpload(pendingResume)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Resume failed')
    } finally {
      setPublishing(false)
      setUploadProgress(null)
    }
  }

  function handleDiscardResume() {
    localStorage.removeItem(`yt-upload:${episodeId}`)
    setPendingResume(null)
  }

  async function queryResumableOffset(resumableUrl: string, totalSize: number): Promise<number> {
    try {
      const res = await fetch(resumableUrl, {
        method: 'PUT',
        headers: { 'Content-Range': `bytes */${totalSize}` },
        body: null,
      })
      if (res.status === 308) {
        const range = res.headers.get('Range')
        if (range) {
          const match = range.match(/bytes=0-(\d+)/)
          if (match) return parseInt(match[1], 10) + 1
        }
        return 0
      }
      if (res.status === 200 || res.status === 201) {
        return totalSize
      }
      if (res.status === 404) {
        throw new Error('Upload session expired. Please try again.')
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('expired')) throw err
    }
    return 0
  }

  async function uploadChunkWithRetry(
    resumableUrl: string, chunk: Blob, offset: number, end: number, totalSize: number, mimeType: string,
  ): Promise<Response> {
    const MAX_RETRIES = 5
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(resumableUrl, {
          method: 'PUT',
          headers: {
            'Content-Range': `bytes ${offset}-${end - 1}/${totalSize}`,
            'Content-Type': mimeType,
          },
          body: chunk,
        })
        if (res.status >= 500 && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 32000)))
          continue
        }
        if (res.status === 404) {
          throw new Error('Upload session expired. Please try again.')
        }
        return res
      } catch (err) {
        if (attempt < MAX_RETRIES && err instanceof TypeError) {
          await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 32000)))
          continue
        }
        throw err
      }
    }
    throw new Error('YouTube upload failed after retries')
  }

  async function streamToYouTube(data: UploadState, startOffset: number) {
    const CHUNK_SIZE = 16 * 1024 * 1024
    const totalSize = data.fileSize

    if (startOffset >= totalSize) {
      localStorage.removeItem(`yt-upload:${episodeId}`)
      setResult({})
      return
    }

    setUploadProgress(-1)
    const downloadRes = await fetch(data.downloadUrl)
    if (!downloadRes.ok) throw new Error('Failed to download video from storage')
    const videoBlob = await downloadRes.blob()

    const isMultiChunk = totalSize - startOffset > CHUNK_SIZE
    setUploadProgress(isMultiChunk ? (startOffset > 0 ? Math.round((startOffset / totalSize) * 100) : 0) : -2)
    let offset = startOffset

    while (offset < totalSize) {
      const end = Math.min(offset + CHUNK_SIZE, totalSize)
      const chunk = videoBlob.slice(offset, end)
      const isLast = end >= totalSize

      if (!isLast) {
        const putRes = await uploadChunkWithRetry(data.resumableUrl, chunk, offset, end, totalSize, data.mimeType)
        if (!putRes.ok && putRes.status !== 308) {
          throw new Error(`YouTube upload failed (${putRes.status})`)
        }
      } else {
        let videoId: string | undefined

        try {
          const putRes = await uploadChunkWithRetry(data.resumableUrl, chunk, offset, end, totalSize, data.mimeType)
          if (putRes.ok) {
            const result = await putRes.json()
            videoId = result.id
          }
        } catch (err) {
          if (!(err instanceof TypeError)) throw err
          // CORS blocks reading YouTube's final response — upload succeeded
        }

        localStorage.removeItem(`yt-upload:${episodeId}`)
        setUploadProgress(100)

        const finalizeRes = await fetch(
          `/api/v1/shows/${data.showId}/episodes/${data.episodeId}/publish/finalize`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              video_id: videoId || 'uploaded',
              title: data.title,
              privacy_status: data.privacy_status,
              scheduled_at: data.scheduled_at,
              channel_id: data.channel_id,
            }),
          }
        )

        if (!finalizeRes.ok) {
          toast.error('Video uploaded to YouTube but failed to update PreRoll. Refresh the page.')
        }

        setResult({
          view_url: videoId ? `https://youtube.com/watch?v=${videoId}` : undefined,
        })
      }

      offset = end
      setUploadProgress(Math.round((offset / totalSize) * 100))
    }
  }

  const inputClasses =
    'w-full rounded-md bg-surface-input border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none'

  const providerName = DISTRIBUTION_PROVIDER_NAMES[provider as keyof typeof DISTRIBUTION_PROVIDER_NAMES] || provider

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

        {pendingResume && !publishing && !result ? (
          <div className="space-y-4">
            <div className="rounded-md bg-warning/5 border border-warning/30 px-4 py-3">
              <p className="text-sm font-medium text-text-primary">Upload in progress</p>
              <p className="mt-1 text-xs text-text-secondary">
                A previous YouTube upload for this episode was interrupted. You can resume it or start over.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleResume}
                className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
              >
                Resume Upload
              </button>
              <button
                onClick={handleDiscardResume}
                className="rounded-md border border-border-default bg-surface-overlay px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-input transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        ) : result ? (
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
              <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-text-primary">
              {publishMode === 'schedule' ? 'Scheduled!' : 'Published!'}
            </p>
            {result.share_url && (
              <a href={result.share_url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-accent hover:text-accent-hover transition-colors">
                View on {providerName} &rarr;
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
                {sourceFiles.map((f) => (
                  <option key={f.id} value={`file:${f.id}`}>
                    {f.name || 'Untitled file'}
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
              {isAudioProvider && sourceFiles.length === 0 && videoFiles.length > 0 && (
                <p className="text-xs text-text-secondary mt-1">
                  {providerName} requires an audio file. Upload an audio version or provide a URL.
                </p>
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

            {isAudioProvider && (
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

            <button
              type="submit"
              disabled={publishing}
              className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishing
                ? uploadProgress === -1
                  ? 'Preparing video...'
                  : uploadProgress === -2
                    ? 'Uploading to YouTube...'
                    : uploadProgress !== null && uploadProgress >= 0
                      ? `Uploading to YouTube — ${uploadProgress}%`
                      : 'Publishing...'
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
