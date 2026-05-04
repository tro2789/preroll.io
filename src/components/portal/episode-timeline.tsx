import Link from 'next/link'

interface Episode {
  id: string
  title: string
  episode_number: number | null
  status: string
  scheduled_publish_date: string | null
  stage: { name: string } | null
  pendingCount: number
}

interface EpisodeTimelineProps {
  episodes: Episode[]
  showId: string
}

const stageColors: Record<string, string> = {
  planning: 'bg-text-tertiary/20 text-text-tertiary',
  recording: 'bg-blue-500/15 text-blue-400',
  editing: 'bg-amber-500/15 text-amber-400',
  review: 'bg-purple-500/15 text-purple-400',
  approved: 'bg-emerald-500/15 text-emerald-400',
  published: 'bg-emerald-500/15 text-emerald-400',
}

function getStageBadgeClass(status: string) {
  return stageColors[status] || stageColors.planning
}

export function EpisodeTimeline({ episodes, showId }: EpisodeTimelineProps) {
  if (episodes.length === 0) {
    return (
      <p className="text-sm text-text-tertiary py-8 text-center">
        No episodes yet.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {episodes.map((ep) => (
        <Link
          key={ep.id}
          href={`/portal/shows/${showId}/episodes/${ep.id}`}
          className="flex items-center justify-between rounded-lg bg-surface-raised border border-border-subtle p-4 hover:border-border-default transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            {ep.episode_number != null && (
              <span className="text-xs font-mono text-text-tertiary w-6 text-right shrink-0">
                {ep.episode_number}
              </span>
            )}
            <span className="text-sm text-text-primary group-hover:text-accent transition-colors truncate">
              {ep.title}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-3">
            {ep.pendingCount > 0 && (
              <span className="text-xs text-accent font-medium">
                {ep.pendingCount} to review
              </span>
            )}
            {ep.scheduled_publish_date && (
              <span className="text-xs text-text-tertiary hidden sm:block">
                {new Date(ep.scheduled_publish_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStageBadgeClass(ep.status)}`}>
              {ep.stage?.name || ep.status}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
