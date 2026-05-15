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
  const [templateDefaults, setTemplateDefaults] = useState<{ description: string; notes: string }>({ description: '', notes: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [stagesRes, showRes] = await Promise.all([
          fetch(`/api/v1/shows/${showId}/stages`),
          fetch(`/api/v1/shows/${showId}`),
        ])
        if (stagesRes.ok) {
          const result = await stagesRes.json()
          setStages(result.data)
        }
        if (showRes.ok) {
          const result = await showRes.json()
          const t = result.data?.episode_template
          if (t) {
            setTemplateDefaults({
              description: t.description || '',
              notes: t.notes || '',
            })
          }
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
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
    window.dispatchEvent(new Event('preroll:episode-created'))
    router.push(`/app/shows/${showId}`)
  }

  if (loading) {
    return <p className="text-text-tertiary">Loading...</p>
  }

  return (
    <div>
      <Link
        href={`/app/shows/${showId}`}
        className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
      >
        &larr; Back to Show
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-text-primary">Add Episode</h1>
      <div className="mt-6">
        <EpisodeForm
          showId={showId}
          stages={stages}
          defaultValues={templateDefaults}
          onSubmit={handleSubmit}
          submitLabel="Create Episode"
        />
      </div>
    </div>
  )
}
