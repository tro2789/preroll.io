'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { EpisodeCardContent, getColumnColor, type Episode } from '@/components/dashboard/kanban-board'
import { useCompactView } from '@/lib/kanban/use-compact-view'

interface Stage {
  id: string
  name: string
  position: number
}

interface PortalEpisode {
  id: string
  title: string
  episode_number: number | null
  status: string
  stage_id: string | null
  scheduled_publish_date: string | null
  pendingCount: number
}

interface PortalKanbanProps {
  showId: string
  episodes: PortalEpisode[]
  stages: Stage[]
}

export function PortalKanban({ showId, episodes, stages }: PortalKanbanProps) {
  const sortedStages = useMemo(() => [...stages].filter((s) => s.name.toLowerCase() !== 'published').sort((a, b) => a.position - b.position), [stages])
  const { compact, toggle: toggleCompact } = useCompactView()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState(() => sortedStages[0]?.id ?? '')

  const kanbanEpisodes: Episode[] = useMemo(() =>
    episodes.map((ep) => ({
      ...ep,
      show_id: showId,
      position: 0,
    })),
    [episodes, showId]
  )

  const filtered = useMemo(() => {
    if (!search) return kanbanEpisodes
    const q = search.toLowerCase()
    return kanbanEpisodes.filter((ep) => ep.title.toLowerCase().includes(q))
  }, [kanbanEpisodes, search])

  const getEpisodesForStage = (stageId: string) =>
    filtered.filter((ep) => ep.stage_id === stageId)

  if (episodes.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-raised/50 px-4 py-10 text-center">
        <p className="text-sm text-text-secondary">No episodes yet.</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile: tab-based single column */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search episodes..."
              className="w-full rounded-md border border-border-subtle bg-surface-input pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="flex border-b border-border-subtle mb-4 overflow-x-auto">
          {sortedStages.map((stage, i) => {
            const count = getEpisodesForStage(stage.id).length
            const isActive = activeTab === stage.id
            const colors = getColumnColor(i)
            return (
              <button
                key={stage.id}
                onClick={() => setActiveTab(stage.id)}
                className={`shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                  isActive ? colors.tab : 'border-transparent text-text-tertiary'
                }`}
              >
                {stage.name}
                {count > 0 && <span className="ml-1.5 text-text-tertiary">{count}</span>}
              </button>
            )
          })}
        </div>

        <div className="space-y-2">
          {getEpisodesForStage(activeTab).map((episode) => (
            <Link key={episode.id} href={`/portal/shows/${showId}/episodes/${episode.id}`}>
              <EpisodeCardContent episode={episode} compact={compact} />
            </Link>
          ))}
          {getEpisodesForStage(activeTab).length === 0 && (
            <div className="rounded-lg border border-dashed border-border-subtle px-3 py-8 text-center">
              <p className="text-xs text-text-secondary">
                No episodes in {sortedStages.find((s) => s.id === activeTab)?.name}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: multi-column kanban layout */}
      <div className="hidden md:block">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search episodes..."
              className="w-full rounded-md border border-border-subtle bg-surface-input pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
          </div>
          <button
            onClick={toggleCompact}
            title={compact ? 'Card view' : 'Compact view'}
            className="shrink-0 ml-auto rounded-md border border-border-subtle bg-surface-overlay p-1.5 text-text-tertiary hover:text-text-secondary hover:border-border-default transition-colors"
          >
            {compact ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm9-9A2.25 2.25 0 0011 4.25v2.5A2.25 2.25 0 0013.25 9h2.5A2.25 2.25 0 0018 6.75v-2.5A2.25 2.25 0 0015.75 2h-2.5zm0 9A2.25 2.25 0 0011 13.25v2.5A2.25 2.25 0 0013.25 18h2.5A2.25 2.25 0 0018 15.75v-2.5A2.25 2.25 0 0015.75 11h-2.5z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.166a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        <div
          className="grid gap-3.5"
          style={{
            gridTemplateColumns: `repeat(${sortedStages.length}, minmax(0, 1fr))`,
            minHeight: 'calc(100vh - 400px)',
          }}
        >
          {sortedStages.map((stage, i) => {
            const stageEpisodes = getEpisodesForStage(stage.id)
            const colors = getColumnColor(i)
            return (
              <div key={stage.id} className="min-w-0 flex flex-col">
                <div className="flex items-center gap-2 px-1 pb-2.5">
                  <span className={`h-[7px] w-[7px] rounded-full ${colors.dot}`} />
                  <h3 className="text-[12.5px] font-semibold text-text-primary tracking-[0.01em]">
                    {stage.name}
                  </h3>
                  <span className="font-mono text-[11px] text-fg-faint">{stageEpisodes.length}</span>
                </div>
                <div className="flex-1 flex flex-col gap-[9px] rounded-lg p-1 pb-3 min-h-[60px]">
                  {stageEpisodes.map((episode) => (
                    <Link key={episode.id} href={`/portal/shows/${showId}/episodes/${episode.id}`}>
                      <EpisodeCardContent episode={episode} compact={compact} />
                    </Link>
                  ))}
                  {stageEpisodes.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border-subtle px-3 py-6 text-center">
                      <p className="text-xs text-text-tertiary">No episodes</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
