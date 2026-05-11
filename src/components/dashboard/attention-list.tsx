import Link from 'next/link'

interface Episode {
  id: string
  title: string
  episode_number: number | null
  status: string
  scheduled_publish_date: string | null
  updated_at?: string
  pipeline_stages?: unknown
  shows: unknown
}

interface AttentionListProps {
  title: string
  episodes: Episode[]
  emptyMessage: string
}

const stageColors: Record<string, string> = {
  planning: 'bg-text-tertiary/20 text-text-tertiary',
  recording: 'bg-blue-500/15 text-blue-400',
  editing: 'bg-amber-500/15 text-amber-400',
  review: 'bg-purple-500/15 text-purple-400',
  approved: 'bg-emerald-500/15 text-emerald-400',
  published: 'bg-emerald-500/15 text-emerald-400',
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0]

  if (dateStr === todayStr) return 'Today'
  if (dateStr === tomorrowStr) return 'Tomorrow'

  const diff = Math.ceil((date.getTime() - now.getTime()) / 86400000)
  if (diff > 0 && diff <= 7) return `in ${diff}d`
  if (diff < 0 && diff >= -7) return `${Math.abs(diff)}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function AttentionList({ title, episodes, emptyMessage }: AttentionListProps) {
  return (
    <div>
      <h2 className="text-xs font-medium uppercase tracking-wider text-text-secondary mb-3">{title}</h2>
      {episodes.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface-raised px-4 py-6 text-center">
          <p className="text-sm text-text-secondary">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {episodes.map((episode) => {
            const stageRaw = episode.pipeline_stages as unknown
            const stage = (Array.isArray(stageRaw) ? stageRaw[0] : stageRaw) as { name: string } | null
            const stageName = stage?.name || episode.status
            const stageClass = stageColors[episode.status] || stageColors.planning
            const showRaw = episode.shows as unknown
            const show = (Array.isArray(showRaw) ? showRaw[0] : showRaw) as { id: string; name: string } | null

            return (
              <Link
                key={episode.id}
                href={`/app/shows/${show?.id}/episodes/${episode.id}`}
                className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised px-3 py-2.5 transition-colors hover:border-border-default group"
              >
                <span className={`shrink-0 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${stageClass}`}>
                  {stageName}
                </span>

                <div className="min-w-0 flex-1">
                  <span className="text-sm text-text-primary group-hover:text-accent transition-colors truncate block">
                    {episode.title}
                  </span>
                  {show && (
                    <span className="text-xs text-text-secondary">{show.name}</span>
                  )}
                </div>

                {episode.episode_number != null && (
                  <span className="shrink-0 text-xs font-mono text-text-secondary">
                    #{episode.episode_number}
                  </span>
                )}

                {episode.scheduled_publish_date && (
                  <span className="shrink-0 text-xs text-text-secondary">
                    {formatRelativeDate(episode.scheduled_publish_date)}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
