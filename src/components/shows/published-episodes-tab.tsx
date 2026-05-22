import Link from 'next/link'
import { Thumbnail } from '@/components/ui/thumbnail'
import type { PublishedEpisode } from '@/components/shows/show-tabs'

interface PublishedEpisodesTabProps {
  showId: string
  episodes: PublishedEpisode[]
}

function formatDate(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function PublishedEpisodesTab({ showId, episodes }: PublishedEpisodesTabProps) {
  if (episodes.length === 0) {
    return (
      <p className="text-sm text-text-tertiary">No published episodes yet.</p>
    )
  }

  return (
    <div className="space-y-1">
      {episodes.map((ep) => (
        <Link
          key={ep.id}
          href={`/app/shows/${showId}/episodes/${ep.id}`}
          className="group flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-overlay px-3 py-2.5 transition-colors hover:border-border-hover"
        >
          <Thumbnail
            id={ep.id}
            imageUrl={ep.image_url}
            className="w-10 h-10 shrink-0 rounded"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {ep.episode_number != null && (
                <span className="text-xs text-text-tertiary tabular-nums shrink-0">
                  {String(ep.episode_number).padStart(2, '0')}
                </span>
              )}
              <span className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                {ep.title}
              </span>
            </div>
          </div>
          <span className="shrink-0 text-xs text-text-tertiary tabular-nums">
            {formatDate(ep.published_at) ?? formatDate(ep.scheduled_publish_date) ?? 'Published'}
          </span>
        </Link>
      ))}
    </div>
  )
}
