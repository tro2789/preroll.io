'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EpisodeForm } from '@/components/episodes/episode-form'
import { ThumbnailUpload } from '@/components/ui/thumbnail-upload'

interface Stage {
  id: string
  name: string
  position: number
}

interface EpisodeData {
  id: string
  title: string
  episode_number: number | null
  description: string | null
  stage_id: string | null
  scheduled_publish_date: string | null
  frame_io_url: string | null
  image_url: string | null
  notes: string | null
}

export default function EditEpisodePage({
  params,
}: {
  params: Promise<{ showId: string; episodeId: string }>
}) {
  const { showId, episodeId } = use(params)
  const router = useRouter()
  const [episode, setEpisode] = useState<EpisodeData | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [episodeRes, stagesRes] = await Promise.all([
          fetch(`/api/v1/shows/${showId}/episodes/${episodeId}`),
          fetch(`/api/v1/shows/${showId}/stages`),
        ])

        if (!episodeRes.ok) throw new Error('Episode not found')

        const episodeResult = await episodeRes.json()
        setEpisode(episodeResult.data)

        if (stagesRes.ok) {
          const stagesResult = await stagesRes.json()
          setStages(stagesResult.data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load episode')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [showId, episodeId])

  async function handleImageUploaded(fileKey: string) {
    const res = await fetch(`/api/v1/shows/${showId}/episodes/${episodeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: fileKey }),
    })
    if (res.ok) {
      setEpisode((prev) => prev ? { ...prev, image_url: fileKey } : prev)
    }
  }

  async function handleSubmit(data: {
    title: string
    episode_number: string
    description: string
    stage_id: string
    scheduled_publish_date: string
    frame_io_url: string
    notes: string
  }) {
    const res = await fetch(`/api/v1/shows/${showId}/episodes/${episodeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title,
        episode_number: data.episode_number ? Number(data.episode_number) : null,
        description: data.description || null,
        stage_id: data.stage_id || null,
        scheduled_publish_date: data.scheduled_publish_date || null,
        frame_io_url: data.frame_io_url || null,
        notes: data.notes || null,
      }),
    })
    const result = await res.json()
    if (!res.ok) {
      throw new Error(result.error || 'Failed to update episode')
    }
    router.push(`/app/shows/${showId}/episodes/${episodeId}`)
  }

  if (loading) {
    return <p className="text-text-tertiary">Loading...</p>
  }

  if (error || !episode) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">{error || 'Episode not found.'}</p>
        <Link
          href={`/app/shows/${showId}`}
          className="mt-4 inline-block text-sm text-accent hover:text-accent-hover"
        >
          Back to Show
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link
        href={`/app/shows/${showId}/episodes/${episodeId}`}
        className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
      >
        &larr; Back to Episode
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-text-primary">Edit Episode</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Update &ldquo;{episode.title}&rdquo;.
      </p>
      <div className="mt-6 max-w-lg">
        <ThumbnailUpload
          id={episodeId}
          imageUrl={episode.image_url}
          showId={showId}
          onUploaded={handleImageUploaded}
          className="mb-6"
        />
        <EpisodeForm
          showId={showId}
          stages={stages}
          defaultValues={{
            title: episode.title || '',
            episode_number: episode.episode_number?.toString() ?? '',
            description: episode.description || '',
            stage_id: episode.stage_id || '',
            scheduled_publish_date: episode.scheduled_publish_date || '',
            frame_io_url: episode.frame_io_url || '',
            notes: episode.notes || '',
          }}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  )
}
