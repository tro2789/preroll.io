import Link from 'next/link'

interface Episode {
  id: string
  title: string
  episode_number: number | null
  status: string
  scheduled_publish_date: string | null
  updated_at: string
  shows: { id: string; name: string } | null
}

interface AttentionListProps {
  title: string
  episodes: Episode[]
  emptyMessage: string
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function AttentionList({ title, episodes, emptyMessage }: AttentionListProps) {
  return (
    <div>
      <h2 className="text-sm font-medium uppercase tracking-wider text-text-tertiary">{title}</h2>
      {episodes.length === 0 ? (
        <p className="mt-3 text-sm text-text-tertiary">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border-subtle">
          {episodes.map((episode) => (
            <li key={episode.id}>
              <Link
                href={`/app/shows/${episode.shows?.id}/episodes/${episode.id}`}
                className="flex items-center justify-between gap-2 px-2 py-2.5 transition-colors hover:bg-surface-raised"
              >
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  {episode.shows && (
                    <span className="shrink-0 text-xs text-text-tertiary">
                      {episode.shows.name}
                      <span className="mx-1 text-border-default">/</span>
                    </span>
                  )}
                  <span className="truncate text-sm text-text-primary">
                    {episode.title}
                  </span>
                  {episode.episode_number !== null && (
                    <span className="ml-1 shrink-0 rounded bg-surface-overlay px-1.5 py-0.5 text-xs text-text-secondary">
                      #{episode.episode_number}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-text-tertiary">
                  {episode.scheduled_publish_date
                    ? formatDate(episode.scheduled_publish_date)
                    : 'No date'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
