'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ReviewPlayer } from '@/components/portal/review-player'
import { CommentsSidebar } from '@/components/portal/comments-sidebar'
import { VersionPickerModal } from '@/components/portal/version-picker-modal'
import type { FileVersion } from '@/lib/constants/deliverables'

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
  const searchParams = useSearchParams()
  const versionFileRefId = searchParams.get('version')

  const [media, setMedia] = useState<Media | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [seekToTime, setSeekToTime] = useState<number | null>(null)

  const [versions, setVersions] = useState<FileVersion[]>([])
  const [showVersionPicker, setShowVersionPicker] = useState(false)

  const mediaApiUrl = versionFileRefId
    ? `/api/v1/deliverables/${deliverableId}/media?file_reference_id=${versionFileRefId}`
    : `/api/v1/deliverables/${deliverableId}/media`

  useEffect(() => {
    if (!deliverableId) return

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [delRes, mediaRes, commentsRes, versionsRes] = await Promise.all([
          fetch(`/api/v1/deliverables/${deliverableId}`),
          fetch(mediaApiUrl),
          fetch(`/api/v1/deliverables/${deliverableId}/comments`),
          fetch(`/api/v1/portal/deliverables/${deliverableId}/versions`),
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

        const versionsJson = await versionsRes.json()
        if (versionsRes.ok && versionsJson.data?.versions) {
          setVersions(versionsJson.data.versions)
        }
      } catch {
        setError('Failed to load review data.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [deliverableId, versionFileRefId])

  const fetchMedia = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(mediaApiUrl)
      const json = await res.json()
      if (res.ok && json.data?.url) {
        setMedia(json.data)
        return json.data.url
      }
    } catch {
      // ignore
    }
    return null
  }, [mediaApiUrl])

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
  const reviewBaseUrl = `/portal/shows/${showId}/episodes/${episodeId}/review/${deliverableId}`

  // Determine current version info
  const currentVersion = versionFileRefId
    ? versions.find((v) => v.id === versionFileRefId)
    : versions.find((v) => v.is_latest)
  const hasMultipleVersions = versions.length > 1

  return (
    <div className="flex flex-col h-auto lg:h-[calc(100vh-6.25rem)] overflow-y-auto lg:overflow-hidden">
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
            {hasMultipleVersions && (
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setShowVersionPicker(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                    <path d="M8 1a.75.75 0 0 1 .75.75V6h4.5a.75.75 0 0 1 0 1.5h-4.5v4.25a.75.75 0 0 1-1.5 0V7.5H2.75a.75.75 0 0 1 0-1.5h4.5V1.75A.75.75 0 0 1 8 1Z" />
                  </svg>
                  v{currentVersion?.version_number ?? '?'}
                  <span className="text-text-tertiary">of {versions.length}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-text-tertiary">
                    <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>
                {currentVersion && !currentVersion.is_latest && (
                  <span className="text-xs text-amber-400">Viewing older version</span>
                )}
              </div>
            )}
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
          <div className="h-[50vh] lg:h-auto lg:w-1/3 min-h-0 shrink-0 lg:shrink rounded-lg border border-border-subtle bg-surface-raised overflow-hidden">
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

      {/* Version picker modal */}
      {showVersionPicker && (
        <VersionPickerModal
          fetchUrl={`/api/v1/portal/deliverables/${deliverableId}/versions`}
          currentFileReferenceId={versionFileRefId || media?.file_reference_id}
          reviewBaseUrl={reviewBaseUrl}
          onClose={() => setShowVersionPicker(false)}
        />
      )}
    </div>
  )
}
