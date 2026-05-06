'use client'

import { useState } from 'react'
import Link from 'next/link'
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
import { Thumbnail } from '@/components/ui/thumbnail'

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
  image_url: string | null
  show_id: string
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

function EpisodeCardContent({ episode }: { episode: Episode }) {
  const isOverdue = episode.scheduled_publish_date && episode.scheduled_publish_date < new Date().toISOString().split('T')[0]

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised overflow-hidden transition-colors hover:border-border-default group">
      <Thumbnail id={episode.id} imageUrl={episode.image_url} className="aspect-[16/9]" />
      <div className="px-3 py-2.5">
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
      </div>
    </div>
  )
}

function DraggableEpisode({ episode, isDragOverlay }: { episode: Episode; isDragOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: episode.id,
    data: { episode },
  })

  if (isDragOverlay) {
    return (
      <div className="rotate-2 scale-105">
        <EpisodeCardContent episode={episode} />
      </div>
    )
  }

  return (
    <a
      ref={setNodeRef}
      href={`/app/shows/${episode.shows?.id}/episodes/${episode.id}`}
      onClick={(e) => { if (isDragging) e.preventDefault() }}
      className={`block cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-0 h-0 overflow-hidden' : ''}`}
      {...listeners}
      {...attributes}
    >
      <EpisodeCardContent episode={episode} />
    </a>
  )
}

function DroppableColumn({ stage, count, children }: { stage: Stage; count: number; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage })

  return (
    <div ref={setNodeRef} className="min-w-0 flex flex-col">
      <div className="flex items-center gap-2 px-1 pb-3">
        <span className={`h-2 w-2 rounded-full ${stageDotColors[stage]}`} />
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${stageHeaderColors[stage]}`}>
          {stageLabels[stage]}
        </h3>
        {count > 0 && <span className="text-xs text-text-tertiary">{count}</span>}
      </div>
      <div className={`flex-1 space-y-2 rounded-lg p-1 transition-colors ${isOver ? 'bg-accent-muted/20' : ''}`}>
        {children}
      </div>
    </div>
  )
}

export function KanbanBoard({ columns: initialColumns }: KanbanBoardProps) {
  const [episodes, setEpisodes] = useState<Episode[]>(() =>
    Object.values(initialColumns).flat()
  )
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null)
  const [activeTab, setActiveTab] = useState<Stage>(() => {
    const first = stages.find(s => episodes.some(ep => ep.status === s))
    return first || 'planning'
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const episode = episodes.find(ep => ep.id === event.active.id)
    setActiveEpisode(episode ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const episodeId = active.id as string
    const overId = over.id as string

    const isOverStage = (stages as readonly string[]).includes(overId)
    const newStatus = isOverStage
      ? overId
      : episodes.find(ep => ep.id === overId)?.status

    if (!newStatus) return

    const episode = episodes.find(ep => ep.id === episodeId)
    if (!episode || episode.status === newStatus) return

    setEpisodes(prev =>
      prev.map(ep => ep.id === episodeId ? { ...ep, status: newStatus } : ep)
    )
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active } = event
    setActiveEpisode(null)

    const episodeId = active.id as string
    const episode = episodes.find(ep => ep.id === episodeId)
    const originalEpisodes = Object.values(initialColumns).flat()
    const originalEpisode = originalEpisodes.find(ep => ep.id === episodeId)

    if (!episode || !originalEpisode) return
    if (episode.status === originalEpisode.status) return

    try {
      const res = await fetch(`/api/v1/shows/${episode.show_id}/episodes/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: episode.status }),
      })

      if (!res.ok) throw new Error('Failed to move episode')
    } catch {
      setEpisodes(prev =>
        prev.map(ep => ep.id === episodeId ? { ...ep, status: originalEpisode.status } : ep)
      )
    }
  }

  return (
    <>
      {/* Mobile: tab bar + single column */}
      <div className="md:hidden">
        <div className="flex border-b border-border-subtle mb-4 overflow-x-auto">
          {stages.map((stage) => {
            const count = episodes.filter(ep => ep.status === stage).length
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
          {episodes.filter(ep => ep.status === activeTab).map((episode) => (
            <Link key={episode.id} href={`/app/shows/${episode.shows?.id}/episodes/${episode.id}`}>
              <EpisodeCardContent episode={episode} />
            </Link>
          ))}
          {episodes.filter(ep => ep.status === activeTab).length === 0 && (
            <div className="rounded-lg border border-dashed border-border-subtle px-3 py-8 text-center">
              <p className="text-xs text-text-tertiary">No episodes in {stageLabels[activeTab]}</p>
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
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-3" style={{ minHeight: 'calc(100vh - 160px)' }}>
            {stages.map((stage) => {
              const stageEpisodes = episodes.filter(ep => ep.status === stage)
              return (
                <DroppableColumn key={stage} stage={stage} count={stageEpisodes.length}>
                  {stageEpisodes.map((episode) => (
                    <DraggableEpisode key={episode.id} episode={episode} />
                  ))}
                  {stageEpisodes.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border-subtle px-3 py-6 text-center">
                      <p className="text-xs text-text-tertiary">No episodes</p>
                    </div>
                  )}
                </DroppableColumn>
              )
            })}
          </div>

          <DragOverlay>
            {activeEpisode ? (
              <DraggableEpisode episode={activeEpisode} isDragOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  )
}
