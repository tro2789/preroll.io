interface ActivityEntry {
  id: string
  action: string
  description: string
  created_at: string
}

interface ActivityFeedProps {
  activities: ActivityEntry[]
}

const dotColors: Record<string, string> = {
  episode_stage_changed: 'bg-blue-400',
  deliverable_submitted: 'bg-amber-400',
  deliverable_approved: 'bg-emerald-400',
  deliverable_revision_requested: 'bg-red-400',
  deliverable_resubmitted: 'bg-amber-400',
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-text-secondary text-center py-6">
        No activity yet.
      </p>
    )
  }

  return (
    <div className="space-y-0">
      {activities.map((entry) => (
        <div key={entry.id} className="flex gap-3 py-2.5">
          <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dotColors[entry.action] || 'bg-blue-400'}`} />
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-[13px] text-text-primary">{entry.description}</p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {new Date(entry.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
