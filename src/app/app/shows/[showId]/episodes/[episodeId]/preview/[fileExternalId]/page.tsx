'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ReviewPlayer } from '@/components/portal/review-player'

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
        <div className="flex-1 min-h-0 flex flex-col">
          <ReviewPlayer
            src={media.url}
            mimeType={media.mime_type}
            duration={media.duration_seconds}
            fillContainer
            title={media.name}
            backUrl={backUrl}
            onRefreshNeeded={fetchMedia}
          />
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
