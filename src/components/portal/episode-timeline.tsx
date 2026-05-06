import Link from 'next/link'
import { PipelineProgress } from './pipeline-progress'

interface Stage {
  id: string
  name: string
  position: number
}

interface Episode {
  id: string
  title: string
  episode_number: number | null
  status: string
  stage_id: string | null
  scheduled_publish_date: string | null
  pendingCount: number
}

interface EpisodeTimelineProps {
  episodes: Episode[]
  stages: Stage[]
  showId: string
}

export function EpisodeTimeline({ episodes, stages, showId }: EpisodeTimelineProps) {
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
          className="block rounded-lg bg-surface-raised border border-border-subtle p-4 hover:border-border-default transition-colors group"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {ep.episode_number != null && (
                  <span className="text-xs font-mono text-text-tertiary shrink-0">
                    {String(ep.episode_number).padStart(2, '0')}
                  </span>
                )}
                <span className="text-sm text-text-primary group-hover:text-accent transition-colors truncate">
                  {ep.title}
                </span>
              </div>
              {stages.length > 0 && (
                <div className="mt-2.5">
                  <PipelineProgress
                    stages={stages}
                    currentStageId={ep.stage_id}
                    size="compact"
                  />
                </div>
              )}
            </div>

            <div className="shrink-0 flex flex-col items-end gap-1.5">
              {ep.pendingCount > 0 && (
                <span className="text-xs text-accent font-medium">
                  {ep.pendingCount} to review
                </span>
              )}
              {ep.scheduled_publish_date && (
                <span className="text-[11px] text-text-tertiary">
                  {new Date(ep.scheduled_publish_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
