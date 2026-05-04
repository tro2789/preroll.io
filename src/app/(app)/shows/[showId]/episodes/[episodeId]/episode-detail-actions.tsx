'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface EpisodeDetailActionsProps {
  showId: string
  episodeId: string
}

export function EpisodeDetailActions({ showId, episodeId }: EpisodeDetailActionsProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this episode? This cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/shows/${showId}/episodes/${episodeId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push(`/app/shows/${showId}`)
      } else {
        alert('Failed to delete episode')
      }
    } catch {
      alert('Failed to delete episode')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center rounded-md bg-red-900/50 border border-red-800 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {deleting ? 'Deleting...' : 'Delete'}
    </button>
  )
}
