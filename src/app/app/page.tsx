'use client'

import { useEffect, useState } from 'react'
import { StatsBar } from '@/components/dashboard/stats-bar'
import { AttentionList } from '@/components/dashboard/attention-list'

interface Episode {
  id: string
  title: string
  episode_number: number | null
  status: string
  scheduled_publish_date: string | null
  updated_at: string
  shows: { id: string; name: string } | null
}

interface DashboardData {
  episodes_in_progress: Episode[]
  upcoming_deadlines: Episode[]
  recent_activity: Episode[]
  stats: {
    client_count: number
    show_count: number
    episodes_this_month: number
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/dashboard')
      .then((res) => res.json())
      .then((json) => setData(json.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <div className="h-4 w-48 animate-pulse rounded bg-surface-raised" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-48 animate-pulse rounded-lg bg-surface-raised" />
          <div className="h-48 animate-pulse rounded-lg bg-surface-raised" />
        </div>
        <div className="h-48 animate-pulse rounded-lg bg-surface-raised" />
      </div>
    )
  }

  if (!data) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="mt-2 text-text-secondary">Failed to load dashboard data.</p>
      </div>
    )
  }

  const isEmpty =
    data.episodes_in_progress.length === 0 &&
    data.upcoming_deadlines.length === 0 &&
    data.recent_activity.length === 0

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <StatsBar stats={data.stats} />
      </div>

      {isEmpty ? (
        <div className="rounded-lg border border-border-subtle bg-surface-raised px-6 py-8 text-center">
          <p className="text-sm text-text-secondary">
            Nothing in the pipeline. Add a show to get started.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AttentionList
              title="Needs Attention"
              episodes={data.episodes_in_progress.slice(0, 8)}
              emptyMessage="All caught up."
            />
            <AttentionList
              title="Upcoming Deadlines"
              episodes={data.upcoming_deadlines}
              emptyMessage="No deadlines in the next 7 days."
            />
          </div>

          <AttentionList
            title="Recent Activity"
            episodes={data.recent_activity}
            emptyMessage="No recent activity."
          />
        </>
      )}
    </div>
  )
}
