'use client'

import Link from 'next/link'
import { Thumbnail } from '@/components/ui/thumbnail'

interface Episode {
  id: string
  title: string
  episode_number: number | null
  scheduled_publish_date: string | null
  frame_io_url: string | null
  image_url?: string | null
  status: string
}

interface EpisodeCardProps {
  episode: Episode
  showId: string
}

export function EpisodeCard({ episode, showId }: EpisodeCardProps) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-overlay overflow-hidden transition-colors hover:border-border-hover">
      <Thumbnail id={episode.id} imageUrl={episode.image_url} className="aspect-[16/9]" />
      <Link
        href={`/app/shows/${showId}/episodes/${episode.id}`}
        className="block p-2.5"
      >
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-text-primary leading-tight">
            {episode.title}
          </h4>
          {episode.frame_io_url && (
            <span
              className="shrink-0 text-accent"
              title="Frame.io link available"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M4.75 3A1.75 1.75 0 003 4.75v2.752l.104-.002h13.792c.035 0 .07 0 .104.002V4.75A1.75 1.75 0 0015.25 3H4.75zM3 13.25V9.5h14v3.75A1.75 1.75 0 0115.25 15H4.75A1.75 1.75 0 013 13.25z" />
              </svg>
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          {episode.episode_number != null && (
            <span className="text-xs text-text-tertiary">
              #{episode.episode_number}
            </span>
          )}
          {episode.scheduled_publish_date && (
            <span className="text-xs text-text-tertiary">
              {episode.scheduled_publish_date}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}
