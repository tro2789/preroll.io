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
  name: string
  file_reference_id: string
}

export default function FilePreviewPage() {
  const { showId, episodeId, fileExternalId } = useParams<{
    showId: string
    episodeId: string
    fileExternalId: string
  }>()

  const [media, setMedia] = useState<Media | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [seekToTime, setSeekToTime] = useState<number | null>(null)

  useEffect(() => {
    if (!fileExternalId) return

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/v1/episodes/${episodeId}/delivery/files/${fileExternalId}/media`)
        const json = await res.json()

        if (!res.ok) {
          setError(json.error || 'Failed to load media')
          return
        }

        if (json.data?.status === 'processing') {
          setError('File is still processing. Please check back shortly.')
          return
        }

        setMedia(json.data)
      } catch {
        setError('Failed to load preview.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [episodeId, fileExternalId])

  const fetchMedia = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/delivery/files/${fileExternalId}/media`)
      const json = await res.json()
      if (res.ok && json.data?.url) {
        setMedia(json.data)
        return json.data.url
      }
    } catch { /* ignore */ }
    return null
  }, [episodeId, fileExternalId])

  const handleSeek = useCallback((seconds: number) => {
    setSeekToTime(seconds)
    setTimeout(() => setSeekToTime(null), 100)
  }, [])

  const backUrl = `/app/shows/${showId}/episodes/${episodeId}`

  return (
    <div className="flex flex-col h-auto lg:h-[calc(100vh-6.5rem)] overflow-y-auto lg:overflow-hidden">
      {error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="rounded-lg border border-border-subtle bg-surface-raised px-6 py-12 text-center">
            <p className="text-sm text-text-secondary">{error}</p>
          </div>
        </div>
      ) : media ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          <div className="flex-[2] min-h-0 flex flex-col">
            <ReviewPlayer
              src={media.url}
              mimeType={media.mime_type}
              duration={media.duration_seconds}
              seekToTime={seekToTime}
              fillContainer
              title={media.name}
              backUrl={backUrl}
              onTimeUpdate={setCurrentTime}
              onRefreshNeeded={fetchMedia}
            />
          </div>
          <div className="h-[50vh] lg:h-auto lg:w-[340px] min-h-0 shrink-0 rounded-lg border border-border-subtle bg-surface-raised overflow-hidden flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
              <svg className="w-8 h-8 text-text-tertiary mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
              <p className="text-sm font-medium text-text-primary mb-1">Comments</p>
              <p className="text-xs text-text-secondary max-w-[220px]">
                Share this file as a deliverable to enable timecoded comments and client review.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-text-secondary">Loading preview...</p>
        </div>
      )}
    </div>
  )
}
