interface ActivityEntry {
  id: string
  action: string
  description: string
  created_at: string
}

interface ActivityFeedProps {
  activities: ActivityEntry[]
}

const actionIcons: Record<string, string> = {
  episode_stage_changed: '▶',
  deliverable_submitted: '●',
  deliverable_approved: '✓',
  deliverable_revision_requested: '↺',
  deliverable_resubmitted: '●',
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
      {activities.map((entry, idx) => (
        <div key={entry.id} className="flex gap-3 py-2.5">
          <div className="flex flex-col items-center">
            <span className="text-xs text-text-secondary w-4 text-center">
              {actionIcons[entry.action] || '●'}
            </span>
            {idx < activities.length - 1 && (
              <div className="w-px flex-1 bg-border-subtle mt-1" />
            )}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-sm text-text-primary">{entry.description}</p>
            <p className="text-sm text-text-secondary mt-0.5">
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
