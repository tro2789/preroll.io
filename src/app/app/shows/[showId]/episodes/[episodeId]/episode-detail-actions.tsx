'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-md border border-border-subtle bg-surface-default px-2 py-1.5 text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors"
        aria-label="More actions"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-400 focus:text-red-400"
        >
          {deleting ? 'Deleting...' : 'Delete episode'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
