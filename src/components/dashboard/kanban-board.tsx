'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core'
import { useKanbanDrag } from '@/lib/kanban/use-kanban-drag'
import type { KanbanColumn, KanbanEpisode } from '@/lib/kanban/types'
import { SortableColumn, CollapseToggle, ColumnCount } from '@/components/kanban/sortable-column'
import { SortableCard, DragOverlayCard } from '@/components/kanban/sortable-card'
import { BoardToolbar, applyFilters, type BoardFilters, type GroupBy } from '@/components/kanban/board-toolbar'
import { useCollapsedColumns } from '@/lib/kanban/use-collapsed-columns'
import { useCompactView } from '@/lib/kanban/use-compact-view'
import { Swimlane } from '@/components/kanban/swimlane'
import { Thumbnail } from '@/components/ui/thumbnail'
import { CardTagPills } from '@/components/kanban/card-tag-pills'

interface DashboardColumn {
  position: number
  name: string
  stageIds: string[]
  wipLimit: number | null
}

interface Episode extends KanbanEpisode {
  updated_at: string
  image_url: string | null
  shows: { id: string; name: string } | null
  client: { id: string; name: string } | null
}

interface KanbanBoardProps {
  columns: DashboardColumn[]
  episodes: Episode[]
}

const columnColors = [
  { header: 'text-sky-400', dot: 'bg-sky-400', tab: 'border-sky-400 text-sky-400' },
  { header: 'text-violet-400', dot: 'bg-violet-400', tab: 'border-violet-400 text-violet-400' },
  { header: 'text-amber-400', dot: 'bg-amber-400', tab: 'border-amber-400 text-amber-400' },
  { header: 'text-orange-400', dot: 'bg-orange-400', tab: 'border-orange-400 text-orange-400' },
  { header: 'text-emerald-400', dot: 'bg-emerald-400', tab: 'border-emerald-400 text-emerald-400' },
  { header: 'text-rose-400', dot: 'bg-rose-400', tab: 'border-rose-400 text-rose-400' },
  { header: 'text-cyan-400', dot: 'bg-cyan-400', tab: 'border-cyan-400 text-cyan-400' },
  { header: 'text-fuchsia-400', dot: 'bg-fuchsia-400', tab: 'border-fuchsia-400 text-fuchsia-400' },
]

function getColumnColor(index: number) {
  return columnColors[index % columnColors.length]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  if (dateStr === todayStr) return 'Today'
  if (dateStr < todayStr) return 'Overdue'

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function EpisodeCardContent({ episode, compact }: { episode: Episode; compact?: boolean }) {
  const isOverdue = episode.scheduled_publish_date && episode.scheduled_publish_date < new Date().toISOString().split('T')[0]

  if (compact) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-raised px-2.5 py-1.5 transition-colors hover:border-border-default group flex items-center gap-2 min-w-0">
        <p className="text-xs font-medium text-text-primary group-hover:text-accent transition-colors truncate min-w-0">
          {episode.title}
        </p>
        <span className="text-[10px] text-text-secondary truncate shrink-0 max-w-[80px]">{episode.shows?.name}</span>
        {episode.tags && episode.tags.length > 0 && (
          <div className="flex gap-0.5 shrink-0">
            {episode.tags.map((tag) => (
              <span key={tag.id} className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} title={tag.name} />
            ))}
          </div>
        )}
        {episode.scheduled_publish_date && (
          <span className={`shrink-0 text-[10px] tabular-nums ml-auto ${isOverdue ? 'text-red-400 font-medium' : 'text-text-secondary'}`}>
            {formatDate(episode.scheduled_publish_date)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden transition-colors hover:border-border-strong group">
      <div className="relative">
        <Thumbnail id={episode.id} imageUrl={episode.image_url} className="aspect-[16/9]" />
        {episode.episode_number != null && (
          <span className="absolute top-1.5 left-2 font-mono text-[9px] text-text-secondary">
            EP {String(episode.episode_number).padStart(3, '0')}
          </span>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className="text-[11.5px] font-medium text-text-primary group-hover:text-accent transition-colors leading-[1.32]">
          {episode.title}
        </p>
        <div className="text-[10px] text-text-tertiary mt-0.5 truncate">{episode.shows?.name}</div>
        <div className="flex items-center gap-[5px] mt-2">
          {episode.tags && episode.tags.length > 0 && (
            <CardTagPills tags={episode.tags} />
          )}
          {episode.scheduled_publish_date && (
            <span className={`shrink-0 text-[9.5px] font-mono tabular-nums ml-auto ${isOverdue ? 'text-error font-medium' : 'text-text-tertiary'}`}>
              {formatDate(episode.scheduled_publish_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function KanbanBoard({ columns: dashboardColumns, episodes: initialEpisodes }: KanbanBoardProps) {
  const [filters, setFilters] = useState<BoardFilters>({ search: '', overdueOnly: false, showId: null, tagIds: [] })
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const { isCollapsed, toggle, expand } = useCollapsedColumns('dashboard')
  const { compact, toggle: toggleCompact } = useCompactView()
  const [showDragCoachmark, setShowDragCoachmark] = useState(false)

  useEffect(() => {
    fetch('/api/v1/onboarding')
      .then((r) => r.json())
      .then((json) => {
        const d = json.data
        if (d && !d.dismissed && !d.steps.episode_moved && d.steps.episode_created) {
          setShowDragCoachmark(true)
        }
      })
      .catch(() => {})
  }, [])

  const kanbanColumns: KanbanColumn[] = dashboardColumns.map((col) => ({
    id: `col-${col.position}`,
    name: col.name,
    stageIds: col.stageIds,
    wipLimit: col.wipLimit,
  }))

  const handleStageChanged = useCallback(() => {
    setShowDragCoachmark(false)
    window.dispatchEvent(new Event('preroll:episode-moved'))
  }, [])

  const {
    episodes,
    activeEpisode,
    sensors,
    announcements,
    getEpisodesForColumn,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useKanbanDrag<Episode>({
    initialEpisodes,
    columns: kanbanColumns,
    getShowId: (ep) => ep.show_id,
    onStageChanged: handleStageChanged,
  })

  const filteredEpisodes = applyFilters(episodes, filters)

  const shows = useMemo(() => {
    const map = new Map<string, string>()
    for (const ep of episodes) {
      if (ep.shows) map.set(ep.shows.id, ep.shows.name)
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [episodes])

  const getFilteredEpisodesForColumn = useCallback((col: KanbanColumn, scopeEpisodes?: Episode[]) => {
    const source = scopeEpisodes ?? filteredEpisodes
    return source.filter((ep) => ep.stage_id && col.stageIds.includes(ep.stage_id))
  }, [filteredEpisodes])

  const swimlaneGroups = useMemo(() => {
    if (groupBy === 'none') return null

    const map = new Map<string, { label: string; episodes: Episode[] }>()
    for (const ep of filteredEpisodes) {
      let key: string
      let label: string

      if (groupBy === 'client') {
        key = ep.client?.id ?? 'unknown'
        label = ep.client?.name ?? 'Unknown Client'
      } else {
        key = ep.shows?.id ?? 'unknown'
        label = ep.shows?.name ?? 'Unknown Show'
      }

      if (!map.has(key)) {
        map.set(key, { label, episodes: [] })
      }
      map.get(key)!.episodes.push(ep)
    }

    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [filteredEpisodes, groupBy])

  const [activeTab, setActiveTab] = useState(() => kanbanColumns[0]?.id ?? '')

  const coachmarkTargetId = useMemo(() => {
    if (!showDragCoachmark) return null
    for (const col of kanbanColumns) {
      const eps = getFilteredEpisodesForColumn(col)
      if (eps.length > 0) return eps[0].id
    }
    return null
  }, [showDragCoachmark, kanbanColumns, getFilteredEpisodesForColumn])

  function renderCard(episode: Episode) {
    const isCoachmarkTarget = episode.id === coachmarkTargetId

    const card = (
      <SortableCard id={episode.id} label={episode.title}>
        <Link
          href={`/app/shows/${episode.shows?.id}/episodes/${episode.id}`}
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        >
          <EpisodeCardContent episode={episode} compact={compact} />
        </Link>
      </SortableCard>
    )

    if (isCoachmarkTarget) {
      return (
        <div key={episode.id}>
          <div className="rounded-lg outline outline-2 outline-accent/50 outline-offset-2">
            {card}
          </div>
          <div className="mt-2 flex items-center gap-1.5 px-0.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-accent shrink-0">
              <path d="M2 7h10M9 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[11px] font-medium text-accent">Drag to the next column</span>
            <button
              onClick={() => setShowDragCoachmark(false)}
              className="ml-auto text-text-tertiary hover:text-text-secondary transition-colors"
              aria-label="Dismiss hint"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M7.5 2.5L2.5 7.5M2.5 2.5L7.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )
    }

    return <div key={episode.id}>{card}</div>
  }

  function renderColumn(col: KanbanColumn, i: number, scopeEpisodes?: Episode[]) {
    const colEpisodes = getFilteredEpisodesForColumn(col, scopeEpisodes)
    const totalCount = scopeEpisodes
      ? scopeEpisodes.filter((ep) => ep.stage_id && col.stageIds.includes(ep.stage_id)).length
      : getEpisodesForColumn(col).length
    const colors = getColumnColor(i)
    const collapsed = isCollapsed(col.id)

    return (
      <SortableColumn
        key={col.id}
        id={col.id}
        name={col.name}
        count={totalCount}
        episodeIds={colEpisodes.map((ep) => ep.id)}
        wipLimit={col.wipLimit}
        collapsed={collapsed}
        header={
          <div className="flex items-center gap-2 px-1 pb-2.5">
            <CollapseToggle collapsed={collapsed} onToggle={() => toggle(col.id)} />
            <span className={`h-[7px] w-[7px] rounded-full ${colors.dot}`} />
            <h3 className="text-[12.5px] font-semibold text-text-primary tracking-[0.01em]">
              {col.name}
            </h3>
            <span className="font-mono text-[11px] text-fg-faint">{totalCount}</span>
            {col.wipLimit != null && (
              <span className="ml-auto font-mono text-[10.5px] text-fg-faint">{totalCount}/{col.wipLimit}</span>
            )}
          </div>
        }
      >
        {colEpisodes.map(renderCard)}
      </SortableColumn>
    )
  }

  return (
    <>
      <div className="md:hidden">
        <BoardToolbar shows={shows} onFilterChange={setFilters} compact={compact} onCompactChange={toggleCompact} />

        <div className="flex border-b border-border-subtle mb-4 overflow-x-auto">
          {kanbanColumns.map((col, i) => {
            const count = getFilteredEpisodesForColumn(col).length
            const isActive = activeTab === col.id
            const colors = getColumnColor(i)
            return (
              <button
                key={col.id}
                onClick={() => setActiveTab(col.id)}
                className={`shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                  isActive ? colors.tab : 'border-transparent text-text-tertiary'
                }`}
              >
                {col.name}
                {count > 0 && <span className="ml-1.5 text-text-tertiary">{count}</span>}
              </button>
            )
          })}
        </div>

        {(() => {
          const activeColumn = kanbanColumns.find((c) => c.id === activeTab)
          const activeEpisodes = activeColumn ? getFilteredEpisodesForColumn(activeColumn) : []
          return (
            <div className="space-y-2">
              {activeEpisodes.map((episode) => (
                <Link key={episode.id} href={`/app/shows/${episode.shows?.id}/episodes/${episode.id}`}>
                  <EpisodeCardContent episode={episode} compact={compact} />
                </Link>
              ))}
              {activeEpisodes.length === 0 && (
                <div className="rounded-lg border border-dashed border-border-subtle px-3 py-8 text-center">
                  <p className="text-xs text-text-secondary">
                    No episodes in {activeColumn?.name}
              </p>
            </div>
          )}
        </div>
          )
        })()}
      </div>

      <div className="hidden md:block">
        <BoardToolbar
          shows={shows}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          onFilterChange={setFilters}
          compact={compact}
          onCompactChange={toggleCompact}
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={(e) => {
            const overId = e.over?.id as string | undefined
            if (overId && isCollapsed(overId)) expand(overId)
            handleDragOver(e)
          }}
          onDragEnd={handleDragEnd}
          accessibility={{ announcements }}
        >
          {swimlaneGroups ? (
            <div style={{ minHeight: 'calc(100vh - 200px)' }}>
              {/* Column headers row */}
              <div
                className="grid gap-3 mb-2"
                style={{ gridTemplateColumns: `repeat(${kanbanColumns.length}, minmax(0, 1fr))` }}
              >
                {kanbanColumns.map((col, i) => {
                  const colors = getColumnColor(i)
                  return (
                    <div key={col.id} className="flex items-center gap-2 px-1">
                      <span className={`h-[7px] w-[7px] rounded-full ${colors.dot}`} />
                      <h3 className="text-[12.5px] font-semibold text-text-primary tracking-[0.01em]">
                        {col.name}
                      </h3>
                    </div>
                  )
                })}
              </div>

              {swimlaneGroups.map((group) => (
                <Swimlane key={group.label} label={group.label} columnCount={kanbanColumns.length}>
                  {kanbanColumns.map((col, i) => {
                    const colEpisodes = getFilteredEpisodesForColumn(col, group.episodes)
                    return (
                      <SortableColumn
                        key={col.id}
                        id={col.id}
                        name={col.name}
                        count={colEpisodes.length}
                        episodeIds={colEpisodes.map((ep) => ep.id)}
                      >
                        {colEpisodes.map(renderCard)}
                      </SortableColumn>
                    )
                  })}
                </Swimlane>
              ))}
            </div>
          ) : (
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${kanbanColumns.length}, minmax(0, 1fr))`,
                minHeight: 'calc(100vh - 200px)',
              }}
            >
              {kanbanColumns.map((col, i) => renderColumn(col, i))}
            </div>
          )}

          <DragOverlay>
            {activeEpisode ? (
              <DragOverlayCard>
                <EpisodeCardContent episode={activeEpisode} compact={compact} />
              </DragOverlayCard>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  )
}
