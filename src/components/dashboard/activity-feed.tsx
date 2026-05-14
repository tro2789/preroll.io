interface Activity {
  id: string
  action: string
  description: string
  created_at: string
  shows: unknown
}

interface DashboardActivityFeedProps {
  activities: Activity[]
}

const actionDots: Record<string, string> = {
  episode_stage_changed: 'bg-blue-400',
  episode_submitted: 'bg-accent',
  deliverable_submitted: 'bg-amber-400',
  deliverable_approved: 'bg-emerald-400',
  deliverable_revision_requested: 'bg-red-400',
  deliverable_resubmitted: 'bg-amber-400',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function DashboardActivityFeed({ activities }: DashboardActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-raised px-4 py-6 text-center">
        <p className="text-sm text-text-secondary">No recent activity.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised divide-y divide-border-subtle">
      {activities.map((a) => {
        const dotColor = actionDots[a.action] || 'bg-text-tertiary'
        const showRaw = a.shows as unknown
        const showObj = (Array.isArray(showRaw) ? showRaw[0] : showRaw) as { name: string } | null
        const showName = showObj?.name

        return (
          <div key={a.id} className="flex items-start gap-3 px-4 py-3">
            <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text-secondary">{a.description}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {showName && <span className="text-xs text-text-secondary">{showName}</span>}
                <span className="text-xs text-text-secondary">{timeAgo(a.created_at)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
