'use client'

import { useState } from 'react'
import { PublishDialog } from '@/components/episodes/publish-dialog'

const PROVIDER_LABELS: Record<string, string> = {
  transistor: 'Transistor',
  youtube: 'YouTube',
}

interface PublishButtonProps {
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
}

export function PublishButton({ showId, episodeId, provider, episode, deliverables }: PublishButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
      >
        Publish to {PROVIDER_LABELS[provider] || provider}
      </button>
      <PublishDialog
        showId={showId}
        episodeId={episodeId}
        provider={provider}
        episode={episode}
        deliverables={deliverables}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
