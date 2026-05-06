'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core'
import { useKanbanDrag } from '@/lib/kanban/use-kanban-drag'
import type { KanbanColumn, KanbanEpisode } from '@/lib/kanban/types'
import { SortableColumn, CollapseToggle, ColumnCount } from '@/components/kanban/sortable-column'
import { SortableCard, DragOverlayCard } from '@/components/kanban/sortable-card'
import { InlineCreateCard } from '@/components/kanban/inline-create-card'
import { BoardToolbar, applyFilters, type BoardFilters } from '@/components/kanban/board-toolbar'
import { BulkActionBar } from '@/components/kanban/bulk-action-bar'
import { useCollapsedColumns } from '@/lib/kanban/use-collapsed-columns'
import { EpisodeCard } from './episode-card'

interface Stage {
  id: string
  name: string
  position: number
  wip_limit?: number | null
}

interface Episode extends KanbanEpisode {
  frame_io_url: string | null
  image_url?: string | null
}

interface PipelineBoardProps {
  showId: string
  stages: Stage[]
  episodes: Episode[]
}

function MobileEpisodeCard({ episode, showId }: { episode: Episode; showId: string }) {
  return (
    <a
      href={`/app/shows/${showId}/episodes/${episode.id}`}
      className="block rounded-lg border border-border-subtle bg-surface-raised px-3 py-2.5 transition-colors hover:border-border-default"
    >
      <p className="text-sm font-medium text-text-primary leading-snug">{episode.title}</p>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-text-tertiary">
        {episode.episode_number != null && <span>EP {String(episode.episode_number).padStart(2, '0')}</span>}
        {episode.scheduled_publish_date && (
          <span>{new Date(episode.scheduled_publish_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        )}
      </div>
    </a>
  )
}

export function PipelineBoard({ showId, stages, episodes: initialEpisodes }: PipelineBoardProps) {
  const router = useRouter()
  const sortedStages = [...stages].sort((a, b) => a.position - b.position)
  const [filters, setFilters] = useState<BoardFilters>({ search: '', overdueOnly: false, showId: null, tagIds: [] })
  const { isCollapsed, toggle, expand } = useCollapsedColumns(`pipeline-${showId}`)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const columns: KanbanColumn[] = sortedStages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    stageIds: [stage.id],
    wipLimit: stage.wip_limit ?? null,
  }))

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
    columns,
    getShowId: () => showId,
    realtimeShowId: showId,
  })

  const filteredEpisodes = applyFilters(episodes, filters)

  const getFilteredEpisodesForColumn = useCallback((col: KanbanColumn) => {
    return filteredEpisodes.filter((ep) => ep.stage_id && col.stageIds.includes(ep.stage_id))
  }, [filteredEpisodes])

  const activeTab = sortedStages[0]?.id || ''

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleBulkMove(stageId: string) {
    const ids = [...selected]
    const res = await fetch(`/api/v1/shows/${showId}/episodes/bulk-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episodeIds: ids, stageId }),
    })
    if (res.ok) {
      setSelected(new Set())
      setSelectMode(false)
      router.refresh()
    }
  }

  return (
    <>
      <MobileTabs
        stages={sortedStages}
        episodes={filteredEpisodes}
        showId={showId}
        defaultTab={activeTab}
        filters={filters}
        onFilterChange={setFilters}
      />

      <div className="hidden md:block">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <BoardToolbar onFilterChange={setFilters} />
          </div>
          <button
            onClick={() => { setSelectMode(!selectMode); setSelected(new Set()) }}
            className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              selectMode
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-border-subtle bg-surface-overlay text-text-tertiary hover:text-text-secondary hover:border-border-default'
            }`}
          >
            {selectMode ? 'Cancel Select' : 'Select'}
          </button>
        </div>

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
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${sortedStages.length}, minmax(0, 1fr))` }}
          >
            {columns.map((col) => {
              const colEpisodes = getFilteredEpisodesForColumn(col)
              const totalCount = getEpisodesForColumn(col).length
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
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-subtle">
                      <div className="flex items-center gap-1.5">
                        <CollapseToggle collapsed={collapsed} onToggle={() => toggle(col.id)} />
                        <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                          {col.name}
                        </h3>
                      </div>
                      <ColumnCount count={totalCount} wipLimit={col.wipLimit} />
                    </div>
                  }
                >
                  {colEpisodes.map((episode) => (
                    <SortableCard
                      key={episode.id}
                      id={episode.id}
                      label={episode.title}
                      selected={selectMode ? selected.has(episode.id) : undefined}
                      onToggleSelect={selectMode ? toggleSelect : undefined}
                    >
                      <EpisodeCard episode={episode} showId={showId} />
                    </SortableCard>
                  ))}
                  <InlineCreateCard
                    showId={showId}
                    stageId={col.stageIds[0]}
                    onCreated={() => router.refresh()}
                  />
                </SortableColumn>
              )
            })}
          </div>

          <DragOverlay>
            {activeEpisode ? (
              <DragOverlayCard>
                <EpisodeCard episode={activeEpisode} showId={showId} />
              </DragOverlayCard>
            ) : null}
          </DragOverlay>
        </DndContext>

        {selectMode && (
          <BulkActionBar
            selectedCount={selected.size}
            stages={sortedStages}
            onBulkMove={handleBulkMove}
            onClearSelection={() => { setSelected(new Set()); setSelectMode(false) }}
          />
        )}
      </div>
    </>
  )
}

function MobileTabs({
  stages,
  episodes,
  showId,
  defaultTab,
  filters,
  onFilterChange,
}: {
  stages: Stage[]
  episodes: Episode[]
  showId: string
  defaultTab: string
  filters: BoardFilters
  onFilterChange: (f: BoardFilters) => void
}) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const activeEpisodes = episodes.filter((ep) => ep.stage_id === activeTab)

  return (
    <div className="md:hidden">
      <BoardToolbar onFilterChange={onFilterChange} />

      <div className="flex border-b border-border-subtle mb-4 overflow-x-auto">
        {stages.map((stage) => {
          const count = episodes.filter((ep) => ep.stage_id === stage.id).length
          const isActive = activeTab === stage.id
          return (
            <button
              key={stage.id}
              onClick={() => setActiveTab(stage.id)}
              className={`shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                isActive
                  ? 'border-accent text-text-primary'
                  : 'border-transparent text-text-tertiary'
              }`}
            >
              {stage.name}
              {count > 0 && <span className="ml-1.5 text-text-tertiary">{count}</span>}
            </button>
          )
        })}
      </div>

      <div className="space-y-2">
        {activeEpisodes.map((episode) => (
          <MobileEpisodeCard key={episode.id} episode={episode} showId={showId} />
        ))}
        {activeEpisodes.length === 0 && (
          <div className="rounded-lg border border-dashed border-border-subtle px-3 py-8 text-center">
            <p className="text-xs text-text-tertiary">No episodes in this stage</p>
          </div>
        )}
      </div>
    </div>
  )
}
