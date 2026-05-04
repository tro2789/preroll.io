'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EpisodeForm } from '@/components/episodes/episode-form'

interface Stage {
  id: string
  name: string
  position: number
}

export default function NewEpisodePage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = use(params)
  const router = useRouter()
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStages() {
      try {
        const res = await fetch(`/api/v1/shows/${showId}/stages`)
        if (res.ok) {
          const result = await res.json()
          setStages(result.data)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchStages()
  }, [showId])

  async function handleSubmit(data: {
    title: string
    episode_number: string
    description: string
    stage_id: string
    scheduled_publish_date: string
    frame_io_url: string
    notes: string
  }) {
    const res = await fetch(`/api/v1/shows/${showId}/episodes`, {
      method: 'POST',
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
      throw new Error(result.error || 'Failed to create episode')
    }
    router.push(`/app/shows/${showId}`)
  }

  if (loading) {
    return <p className="text-zinc-400">Loading...</p>
  }

  return (
    <div>
      <Link
        href={`/app/shows/${showId}`}
        className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
      >
        &larr; Back to Show
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-white">Add Episode</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Create a new episode for this show.
      </p>
      <div className="mt-6">
        <EpisodeForm
          showId={showId}
          stages={stages}
          onSubmit={handleSubmit}
          submitLabel="Create Episode"
        />
      </div>
    </div>
  )
}
