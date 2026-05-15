'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { KanbanBoard } from '@/components/dashboard/kanban-board'
import { PageHeader } from '@/components/layout/page-header'

interface DashboardColumn {
  position: number
  name: string
  stageIds: string[]
  wipLimit: number | null
}

interface Episode {
  id: string
  title: string
  episode_number: number | null
  status: string
  stage_id: string
  position: number
  scheduled_publish_date: string | null
  updated_at: string
  image_url: string | null
  show_id: string
  shows: { id: string; name: string } | null
  client: { id: string; name: string } | null
  tags: { id: string; name: string; color: string }[]
  [key: string]: unknown
}

interface Activity {
  id: string
  action: string
  description: string
  created_at: string
  show_id: string
  episode_id: string | null
  shows: { name: string } | null
}

interface DashboardTabsProps {
  columns: DashboardColumn[]
  episodes: Episode[]
}

type Tab = 'board' | 'activity'

const actionDots: Record<string, string> = {
  episode_stage_changed: 'bg-blue-400',
  deliverable_submitted: 'bg-amber-400',
  deliverable_approved: 'bg-emerald-400',
  deliverable_revision_requested: 'bg-red-400',
  deliverable_resubmitted: 'bg-amber-400',
  episode_published: 'bg-emerald-400',
  file_uploaded: 'bg-sky-400',
  transcription_completed: 'bg-violet-400',
  ai_generation_completed: 'bg-violet-400',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface ActivityFilters {
  showId: string | null
  search: string
}

export function DashboardTabs({ columns, episodes }: DashboardTabsProps) {
  const searchParams = useSearchParams()
  const paramTab = searchParams.get('tab') === 'activity' ? 'activity' as Tab : 'board' as Tab
  const [tab, setTab] = useState<Tab>(paramTab)

  useEffect(() => {
    setTab(paramTab)
  }, [paramTab])
  const [activities, setActivities] = useState<Activity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activitiesFetched, setActivitiesFetched] = useState(false)
  const [activityFilters, setActivityFilters] = useState<ActivityFilters>({ showId: null, search: '' })

  const shows = Array.from(
    new Map(episodes.filter(e => e.shows).map(e => [e.shows!.id, e.shows!])).values()
  )

  useEffect(() => {
    if (tab !== 'activity' || activitiesFetched) return
    setActivitiesLoading(true)
    fetch('/api/v1/dashboard')
      .then(r => r.json())
      .then(json => {
        const raw = json.data?.recent_activity || []
        setActivities(raw.map((a: Record<string, unknown>) => {
          const showRaw = a.shows as unknown
          const show = (Array.isArray(showRaw) ? showRaw[0] : showRaw) as { name: string } | null
          return { ...a, shows: show }
        }))
        setActivitiesFetched(true)
      })
      .catch(() => {})
      .finally(() => setActivitiesLoading(false))
  }, [tab, activitiesFetched])

  const filteredActivities = activities.filter(a => {
    if (activityFilters.showId && a.show_id !== activityFilters.showId) return false
    if (activityFilters.search) {
      const q = activityFilters.search.toLowerCase()
      if (!a.description.toLowerCase().includes(q) && !(a.shows?.name || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <>
      <PageHeader
        title="Dashboard"
        tabs={
          <div className="flex gap-0.5 border-b border-border-subtle">
            <button
              onClick={() => setTab('board')}
              className={`px-2.5 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                tab === 'board'
                  ? 'text-text-primary border-accent'
                  : 'text-text-secondary border-transparent hover:text-text-primary'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setTab('activity')}
              className={`px-2.5 py-2 text-[13px] font-[450] border-b-2 -mb-px transition-colors ${
                tab === 'activity'
                  ? 'text-text-primary border-accent'
                  : 'text-text-secondary border-transparent hover:text-text-primary'
              }`}
            >
              Activity
            </button>
          </div>
        }
      />

      <div className={tab !== 'board' ? 'hidden' : undefined}>
        {episodes.length === 0 ? (
          <p className="text-sm text-text-tertiary py-12 text-center">No episodes yet. Create a show and add your first episode to get started.</p>
        ) : (
          <KanbanBoard columns={columns} episodes={episodes} />
        )}
      </div>

      <div className={tab !== 'activity' ? 'hidden' : undefined}>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              value={activityFilters.search}
              onChange={e => setActivityFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Search activity..."
              className="w-full rounded-md border border-border-subtle bg-surface-input pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
          </div>

          {shows.length > 1 && (
            <select
              value={activityFilters.showId || ''}
              onChange={e => setActivityFilters(f => ({ ...f, showId: e.target.value || null }))}
              className="shrink-0 rounded-md border border-border-subtle bg-surface-input px-2.5 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
            >
              <option value="">All Shows</option>
              {shows.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          {(activityFilters.search || activityFilters.showId) && (
            <button
              onClick={() => setActivityFilters({ showId: null, search: '' })}
              className="shrink-0 text-xs text-text-tertiary hover:text-text-primary transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {activitiesLoading ? (
          <div className="py-12 text-center text-sm text-text-secondary">Loading activity...</div>
        ) : filteredActivities.length === 0 ? (
          <div className="rounded-lg border border-border-subtle bg-surface-raised px-4 py-8 text-center">
            <p className="text-sm text-text-secondary">No recent activity{activityFilters.search || activityFilters.showId ? ' matching filters' : ''}.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border-subtle bg-surface-raised divide-y divide-border-subtle">
            {filteredActivities.map(a => {
              const dotColor = actionDots[a.action] || 'bg-text-tertiary'
              return (
                <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary">{a.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {a.shows?.name && <span className="text-xs text-text-secondary">{a.shows.name}</span>}
                      <span className="text-xs text-text-secondary">{timeAgo(a.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
