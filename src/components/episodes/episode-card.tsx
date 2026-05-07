'use client'

import Link from 'next/link'
import { Thumbnail } from '@/components/ui/thumbnail'
import { CardTagPills } from '@/components/kanban/card-tag-pills'
import type { EpisodeTag } from '@/lib/kanban/types'

interface Episode {
  id: string
  title: string
  episode_number: number | null
  scheduled_publish_date: string | null
  frame_io_url: string | null
  image_url?: string | null
  status: string
  distribution_status?: string | null
  tags?: EpisodeTag[]
}

interface EpisodeCardProps {
  episode: Episode
  showId: string
  compact?: boolean
  onArchive?: (episodeId: string) => void
}

export function EpisodeCard({ episode, showId, compact, onArchive }: EpisodeCardProps) {
  if (compact) {
    return (
      <Link
        href={`/app/shows/${showId}/episodes/${episode.id}`}
        className="group/card flex items-center gap-2 rounded-md border border-border-subtle bg-surface-overlay px-2.5 py-1.5 transition-colors hover:border-border-hover min-w-0"
      >
        {episode.episode_number != null && (
          <span className="text-[10px] text-text-tertiary tabular-nums shrink-0">
            {String(episode.episode_number).padStart(2, '0')}
          </span>
        )}
        <span className="text-xs font-medium text-text-primary group-hover/card:text-accent transition-colors truncate min-w-0">
          {episode.title}
        </span>
        {episode.tags && episode.tags.length > 0 && (
          <div className="flex gap-0.5 shrink-0">
            {episode.tags.map((tag) => (
              <span key={tag.id} className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} title={tag.name} />
            ))}
          </div>
        )}
        {episode.distribution_status === 'published' && (
          <span className="shrink-0 h-2 w-2 rounded-full bg-emerald-400" title="Published to Transistor" />
        )}
        {episode.distribution_status === 'scheduled' && (
          <span className="shrink-0 h-2 w-2 rounded-full bg-amber-400" title="Scheduled on Transistor" />
        )}
        {episode.frame_io_url && (
          <span className="shrink-0 text-accent" title="Frame.io">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
              <path d="M4.75 3A1.75 1.75 0 003 4.75v2.752l.104-.002h13.792c.035 0 .07 0 .104.002V4.75A1.75 1.75 0 0015.25 3H4.75zM3 13.25V9.5h14v3.75A1.75 1.75 0 0115.25 15H4.75A1.75 1.75 0 013 13.25z" />
            </svg>
          </span>
        )}
        {episode.scheduled_publish_date && (
          <span className="shrink-0 text-[10px] text-text-tertiary tabular-nums ml-auto">
            {new Date(episode.scheduled_publish_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="group/card rounded-lg border border-border-subtle bg-surface-overlay overflow-hidden transition-colors hover:border-border-hover">
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
          {episode.distribution_status === 'published' && (
            <span className="shrink-0 h-2 w-2 rounded-full bg-emerald-400" title="Published to Transistor" />
          )}
          {episode.distribution_status === 'scheduled' && (
            <span className="shrink-0 h-2 w-2 rounded-full bg-amber-400" title="Scheduled on Transistor" />
          )}
        </div>
        {episode.tags && episode.tags.length > 0 && (
          <CardTagPills tags={episode.tags} />
        )}
      </Link>
      {onArchive && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive(episode.id) }}
          className="w-full border-t border-border-subtle px-2.5 py-1.5 text-xs text-text-tertiary hover:text-text-secondary hover:bg-surface-raised transition-colors opacity-0 group-hover/card:opacity-100"
          title="Archive episode"
        >
          Archive
        </button>
      )}
    </div>
  )
}
