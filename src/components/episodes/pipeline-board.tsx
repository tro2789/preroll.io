'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { EpisodeCard } from './episode-card'

interface Stage {
  id: string
  name: string
  position: number
}

interface Episode {
  id: string
  title: string
  episode_number: number | null
  scheduled_publish_date: string | null
  frame_io_url: string | null
  image_url?: string | null
  status: string
  stage_id: string | null
}

interface PipelineBoardProps {
  showId: string
  stages: Stage[]
  episodes: Episode[]
}

function DroppableColumn({ stage, children }: { stage: Stage; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.id })

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-0 flex-col rounded-lg border transition-colors ${
        isOver
          ? 'bg-accent-muted/30 border-accent/40'
          : 'bg-surface-raised border-border-subtle'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-subtle">
        <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          {stage.name}
        </h3>
      </div>
      <div className="flex flex-col gap-2 p-2 min-h-[100px]">
        {children}
      </div>
    </div>
  )
}

function DraggableEpisode({
  episode,
  showId,
  isDragOverlay,
}: {
  episode: Episode
  showId: string
  isDragOverlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: episode.id,
    data: { episode },
  })

  if (isDragOverlay) {
    return (
      <div className="rotate-2 scale-105">
        <EpisodeCard episode={episode} showId={showId} />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-0 h-0 overflow-hidden' : ''}`}
      {...listeners}
      {...attributes}
    >
      <EpisodeCard episode={episode} showId={showId} />
    </div>
  )
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
  const [episodes, setEpisodes] = useState<Episode[]>(initialEpisodes)
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null)
  const sortedStages = [...stages].sort((a, b) => a.position - b.position)
  const [activeTab, setActiveTab] = useState(() => sortedStages[0]?.id || '')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const episode = episodes.find((ep) => ep.id === event.active.id)
    setActiveEpisode(episode ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const episodeId = active.id as string
    const overId = over.id as string

    const isOverStage = sortedStages.some((s) => s.id === overId)
    const newStageId = isOverStage
      ? overId
      : episodes.find((ep) => ep.id === overId)?.stage_id

    if (!newStageId) return

    const episode = episodes.find((ep) => ep.id === episodeId)
    if (!episode || episode.stage_id === newStageId) return

    setEpisodes((prev) =>
      prev.map((ep) =>
        ep.id === episodeId ? { ...ep, stage_id: newStageId } : ep
      )
    )
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveEpisode(null)

    if (!over) return

    const episodeId = active.id as string
    const episode = episodes.find((ep) => ep.id === episodeId)
    const originalEpisode = initialEpisodes.find((ep) => ep.id === episodeId)

    if (!episode || !originalEpisode) return
    if (episode.stage_id === originalEpisode.stage_id) return

    try {
      const res = await fetch(`/api/v1/shows/${showId}/episodes/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: episode.stage_id }),
      })

      if (!res.ok) throw new Error('Failed to move episode')
    } catch {
      setEpisodes((prev) =>
        prev.map((ep) =>
          ep.id === episodeId ? { ...ep, stage_id: originalEpisode.stage_id } : ep
        )
      )
    }
  }

  return (
    <>
      {/* Mobile: stage tabs + single column */}
      <div className="md:hidden">
        <div className="flex border-b border-border-subtle mb-4 overflow-x-auto">
          {sortedStages.map((stage) => {
            const count = episodes.filter(ep => ep.stage_id === stage.id).length
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
          {episodes.filter(ep => ep.stage_id === activeTab).map((episode) => (
            <MobileEpisodeCard key={episode.id} episode={episode} showId={showId} />
          ))}
          {episodes.filter(ep => ep.stage_id === activeTab).length === 0 && (
            <div className="rounded-lg border border-dashed border-border-subtle px-3 py-8 text-center">
              <p className="text-xs text-text-tertiary">No episodes in this stage</p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: draggable kanban grid */}
      <div className="hidden md:block">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${sortedStages.length}, minmax(0, 1fr))` }}>
            {sortedStages.map((stage) => {
              const stageEpisodes = episodes.filter((ep) => ep.stage_id === stage.id)
              return (
                <DroppableColumn key={stage.id} stage={stage}>
                  {stageEpisodes.map((episode) => (
                    <DraggableEpisode
                      key={episode.id}
                      episode={episode}
                      showId={showId}
                    />
                  ))}
                  {stageEpisodes.length === 0 && (
                    <p className="text-xs text-text-tertiary text-center py-4">
                      No episodes
                    </p>
                  )}
                </DroppableColumn>
              )
            })}
          </div>

          <DragOverlay>
            {activeEpisode ? (
              <DraggableEpisode
                episode={activeEpisode}
                showId={showId}
                isDragOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  )
}
