'use client'

import { useState } from 'react'
import Link from 'next/link'

const stages = ['planning', 'recording', 'editing', 'review', 'approved'] as const
type Stage = (typeof stages)[number]

const stageLabels: Record<Stage, string> = {
  planning: 'Planning',
  recording: 'Recording',
  editing: 'Editing',
  review: 'Review',
  approved: 'Approved',
}

const stageHeaderColors: Record<Stage, string> = {
  planning: 'text-sky-400',
  recording: 'text-violet-400',
  editing: 'text-amber-400',
  review: 'text-orange-400',
  approved: 'text-emerald-400',
}

const stageDotColors: Record<Stage, string> = {
  planning: 'bg-sky-400',
  recording: 'bg-violet-400',
  editing: 'bg-amber-400',
  review: 'bg-orange-400',
  approved: 'bg-emerald-400',
}

const stageTabColors: Record<Stage, string> = {
  planning: 'border-sky-400 text-sky-400',
  recording: 'border-violet-400 text-violet-400',
  editing: 'border-amber-400 text-amber-400',
  review: 'border-orange-400 text-orange-400',
  approved: 'border-emerald-400 text-emerald-400',
}

interface Episode {
  id: string
  title: string
  episode_number: number | null
  status: string
  scheduled_publish_date: string | null
  updated_at: string
  shows: { id: string; name: string } | null
}

interface KanbanBoardProps {
  columns: Record<string, Episode[]>
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  if (dateStr === todayStr) return 'Today'
  if (dateStr < todayStr) return 'Overdue'

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function EpisodeCard({ episode }: { episode: Episode }) {
  const isOverdue = episode.scheduled_publish_date && episode.scheduled_publish_date < new Date().toISOString().split('T')[0]

  return (
    <Link
      href={`/app/shows/${episode.shows?.id}/episodes/${episode.id}`}
      className="block rounded-lg border border-border-subtle bg-surface-raised px-3 py-2.5 transition-colors hover:border-border-default group"
    >
      <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors leading-snug">
        {episode.title}
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] text-text-tertiary truncate">{episode.shows?.name}</span>
        {episode.scheduled_publish_date && (
          <span className={`shrink-0 text-[11px] tabular-nums ${isOverdue ? 'text-red-400 font-medium' : 'text-text-tertiary'}`}>
            {formatDate(episode.scheduled_publish_date)}
          </span>
        )}
      </div>
    </Link>
  )
}

function ColumnHeader({ stage, count }: { stage: Stage; count: number }) {
  return (
    <div className="flex items-center gap-2 px-1 pb-3">
      <span className={`h-2 w-2 rounded-full ${stageDotColors[stage]}`} />
      <h3 className={`text-xs font-semibold uppercase tracking-wider ${stageHeaderColors[stage]}`}>
        {stageLabels[stage]}
      </h3>
      {count > 0 && <span className="text-xs text-text-tertiary">{count}</span>}
    </div>
  )
}

export function KanbanBoard({ columns }: KanbanBoardProps) {
  const [activeTab, setActiveTab] = useState<Stage>(() => {
    const first = stages.find(s => (columns[s]?.length || 0) > 0)
    return first || 'planning'
  })

  return (
    <>
      {/* Mobile: tab bar + single column */}
      <div className="md:hidden">
        <div className="flex border-b border-border-subtle mb-4 overflow-x-auto">
          {stages.map((stage) => {
            const count = columns[stage]?.length || 0
            const isActive = activeTab === stage
            return (
              <button
                key={stage}
                onClick={() => setActiveTab(stage)}
                className={`shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                  isActive
                    ? stageTabColors[stage]
                    : 'border-transparent text-text-tertiary'
                }`}
              >
                {stageLabels[stage]}
                {count > 0 && <span className="ml-1.5 text-text-tertiary">{count}</span>}
              </button>
            )
          })}
        </div>

        <div className="space-y-2">
          {(columns[activeTab] || []).map((episode) => (
            <EpisodeCard key={episode.id} episode={episode} />
          ))}
          {(columns[activeTab] || []).length === 0 && (
            <div className="rounded-lg border border-dashed border-border-subtle px-3 py-8 text-center">
              <p className="text-xs text-text-tertiary">No episodes in {stageLabels[activeTab]}</p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: full kanban grid */}
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-3" style={{ minHeight: 'calc(100vh - 160px)' }}>
        {stages.map((stage) => {
          const episodes = columns[stage] || []
          return (
            <div key={stage} className="min-w-0 flex flex-col">
              <ColumnHeader stage={stage} count={episodes.length} />
              <div className="flex-1 space-y-2">
                {episodes.map((episode) => (
                  <EpisodeCard key={episode.id} episode={episode} />
                ))}
                {episodes.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border-subtle px-3 py-6 text-center">
                    <p className="text-xs text-text-tertiary">No episodes</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
