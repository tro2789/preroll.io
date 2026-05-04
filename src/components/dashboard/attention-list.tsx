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
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {episodes.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {episodes.map((episode) => (
            <li key={episode.id}>
              <Link
                href={`/app/shows/${episode.shows?.id}/episodes/${episode.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-800/50 px-4 py-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {episode.shows && (
                      <p className="text-xs text-zinc-500">{episode.shows.name}</p>
                    )}
                    <p className="truncate text-sm font-medium text-white">
                      {episode.title}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {episode.episode_number !== null && (
                      <span className="inline-flex items-center rounded-full bg-indigo-900/50 px-2 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-700/50">
                        #{episode.episode_number}
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">
                      {episode.scheduled_publish_date
                        ? formatDate(episode.scheduled_publish_date)
                        : 'No date set'}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
