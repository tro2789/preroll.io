'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ReviewPlayer } from '@/components/portal/review-player'
import { CommentsSidebar } from '@/components/portal/comments-sidebar'

interface Media {
  url: string
  mime_type: string
  duration_seconds: number | null
  status: string
  file_reference_id: string
}

interface Comment {
  id: string
  author_name: string
  text: string
  timestamp_secs: number | null
  is_external: boolean
  created_at: string
}

interface Deliverable {
  title: string
  type: string
  file_url: string | null
}

export default function ReviewPage() {
  const { showId, episodeId, deliverableId } = useParams<{
    showId: string
    episodeId: string
    deliverableId: string
  }>()

  const [media, setMedia] = useState<Media | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [seekToTime, setSeekToTime] = useState<number | null>(null)

  useEffect(() => {
    if (!deliverableId) return

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [delRes, mediaRes, commentsRes] = await Promise.all([
          fetch(`/api/v1/deliverables/${deliverableId}`),
          fetch(`/api/v1/deliverables/${deliverableId}/media`),
          fetch(`/api/v1/deliverables/${deliverableId}/comments`),
        ])

        const delJson = await delRes.json()
        if (delRes.ok && delJson.data) {
          setDeliverable(delJson.data)
        }

        const mediaJson = await mediaRes.json()
        if (mediaRes.ok && mediaJson.data) {
          if (mediaJson.data.status === 'processing') {
            setError('Media is still processing. Please check back shortly.')
          } else {
            setMedia(mediaJson.data)
          }
        } else {
          setError('Media not found or unavailable for this deliverable.')
        }

        const commentsJson = await commentsRes.json()
        if (commentsRes.ok) {
          setComments(commentsJson.data || [])
        }
      } catch {
        setError('Failed to load review data.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [deliverableId])

  const fetchMedia = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(`/api/v1/deliverables/${deliverableId}/media`)
      const json = await res.json()
      if (res.ok && json.data?.url) {
        setMedia(json.data)
        return json.data.url
      }
    } catch {
      // ignore
    }
    return null
  }, [deliverableId])

  const handleCommentSubmit = useCallback(
    async (text: string, timestampSecs: number) => {
      const res = await fetch(`/api/v1/deliverables/${deliverableId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, timestamp_secs: timestampSecs }),
      })

      if (!res.ok) {
        throw new Error('Failed to submit comment')
      }

      const json = await res.json()
      if (json.data) {
        setComments((prev) =>
          [...prev, json.data].sort((a, b) => {
            const tsA = a.timestamp_secs ?? -1
            const tsB = b.timestamp_secs ?? -1
            if (tsA !== tsB) return tsA - tsB
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          }),
        )
      }
    },
    [deliverableId],
  )

  const handleSeek = useCallback((seconds: number) => {
    setSeekToTime(seconds)
    setTimeout(() => setSeekToTime(null), 100)
  }, [])

  const backUrl = `/portal/shows/${showId}/episodes/${episodeId}`

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)]">
      {/* Error state */}
      {error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="rounded-lg border border-border-subtle bg-surface-raised px-6 py-12 text-center">
            <p className="text-sm text-text-secondary">{error}</p>
          </div>
        </div>
      ) : media ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          <div className="flex-1 lg:w-2/3 min-h-0 flex flex-col">
            <ReviewPlayer
              src={media.url}
              mimeType={media.mime_type}
              duration={media.duration_seconds}
              seekToTime={seekToTime}
              fillContainer
              title={deliverable?.title}
              backUrl={backUrl}
              downloadUrl={deliverable?.file_url}
              onTimeUpdate={setCurrentTime}
              onRefreshNeeded={fetchMedia}
            />
          </div>
          <div className="lg:w-1/3 min-h-0 rounded-lg border border-border-subtle bg-surface-raised overflow-hidden">
            <CommentsSidebar
              comments={comments}
              currentTime={currentTime}
              onSeek={handleSeek}
              onSubmit={handleCommentSubmit}
            />
          </div>
        </div>
      ) : null}

      {/* Loading state */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-tertiary">Loading review...</p>
        </div>
      )}
    </div>
  )
}
