import { useState, useRef, useCallback, useMemo } from 'react'
import {
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import type { KanbanEpisode, KanbanColumn } from './types'
import { useRealtimeEpisodes } from './use-realtime-episodes'

interface UseKanbanDragOptions<T extends KanbanEpisode> {
  initialEpisodes: T[]
  columns: KanbanColumn[]
  getShowId: (episode: T) => string
  realtimeShowId?: string
  onStageChanged?: () => void
}

export function useKanbanDrag<T extends KanbanEpisode>({
  initialEpisodes,
  columns,
  getShowId,
  realtimeShowId,
  onStageChanged,
}: UseKanbanDragOptions<T>) {
  const [episodes, setEpisodes] = useState<T[]>(initialEpisodes)
  const lastConfirmedRef = useRef(episodes)
  const [activeEpisode, setActiveEpisode] = useState<T | null>(null)
  const isDragging = activeEpisode !== null

  const stageIdToColumnId = useMemo(() => {
    const map = new Map<string, string>()
    for (const col of columns) {
      for (const stageId of col.stageIds) {
        map.set(stageId, col.id)
      }
    }
    return map
  }, [columns])

  useRealtimeEpisodes<T>({
    showId: realtimeShowId,
    isDragging,
    onInsert: useCallback((episode: T) => {
      setEpisodes((prev) => {
        if (prev.some((ep) => ep.id === episode.id)) return prev
        const updated = [...prev, episode]
        lastConfirmedRef.current = updated
        return updated
      })
    }, []),
    onUpdate: useCallback((episode: T) => {
      setEpisodes((prev) => {
        const updated = prev.map((ep) => ep.id === episode.id ? { ...ep, ...episode } : ep)
        lastConfirmedRef.current = updated
        return updated
      })
    }, []),
    onDelete: useCallback((episodeId: string) => {
      setEpisodes((prev) => {
        const updated = prev.filter((ep) => ep.id !== episodeId)
        lastConfirmedRef.current = updated
        return updated
      })
    }, []),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function getEpisodesForColumn(col: KanbanColumn): T[] {
    return episodes.filter((ep) => ep.stage_id && col.stageIds.includes(ep.stage_id))
  }

  function resolveColumnId(overId: string): string | undefined {
    if (columns.some((c) => c.id === overId)) return overId
    const overEp = episodes.find((ep) => ep.id === overId)
    if (overEp?.stage_id) return stageIdToColumnId.get(overEp.stage_id)
    return undefined
  }

  function resolveTargetStageId(columnId: string): string | null {
    const col = columns.find((c) => c.id === columnId)
    return col?.stageIds[0] ?? null
  }

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const episode = episodes.find((ep) => ep.id === event.active.id)
    setActiveEpisode(episode ?? null)
  }, [episodes])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const episodeId = active.id as string
    const overId = over.id as string

    const targetColId = resolveColumnId(overId)
    if (!targetColId) return

    const episode = episodes.find((ep) => ep.id === episodeId)
    if (!episode) return

    const currentColId = episode.stage_id ? stageIdToColumnId.get(episode.stage_id) : undefined
    if (currentColId === targetColId) return

    const newStageId = resolveTargetStageId(targetColId)
    if (!newStageId) return

    setEpisodes((prev) =>
      prev.map((ep) => ep.id === episodeId ? { ...ep, stage_id: newStageId } as T : ep)
    )
  }, [episodes, columns, stageIdToColumnId])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveEpisode(null)

    if (!over) return

    const episodeId = active.id as string
    const episode = episodes.find((ep) => ep.id === episodeId)
    const originalEpisode = lastConfirmedRef.current.find((ep) => ep.id === episodeId)

    if (!episode || !originalEpisode) return

    const activeColId = episode.stage_id ? stageIdToColumnId.get(episode.stage_id) : undefined
    const overColId = resolveColumnId(over.id as string)
    const crossColumn = episode.stage_id !== originalEpisode.stage_id

    if (!crossColumn && activeColId === overColId) {
      const col = columns.find((c) => c.id === activeColId)
      if (col) {
        const colEpisodes = getEpisodesForColumn(col)
        const oldIndex = colEpisodes.findIndex((ep) => ep.id === episodeId)
        const overEpId = over.id as string
        const newIndex = colEpisodes.findIndex((ep) => ep.id === overEpId)

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(colEpisodes, oldIndex, newIndex)
          const updatedPositions = new Map<string, number>()
          reordered.forEach((ep, i) => updatedPositions.set(ep.id, i))

          setEpisodes((prev) =>
            prev.map((ep) => {
              const newPos = updatedPositions.get(ep.id)
              return newPos != null ? { ...ep, position: newPos } as T : ep
            })
          )

          try {
            const showId = getShowId(episode)
            const res = await fetch(`/api/v1/shows/${showId}/episodes/reorder`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                episodeId,
                stageId: episode.stage_id,
                position: newIndex,
              }),
            })
            if (!res.ok) throw new Error('Reorder failed')
            lastConfirmedRef.current = episodes.map((ep) => {
              const newPos = updatedPositions.get(ep.id)
              return newPos != null ? { ...ep, position: newPos } as T : ep
            })
          } catch {
            setEpisodes(lastConfirmedRef.current)
          }
          return
        }
      }
    }

    if (!crossColumn) return

    try {
      const showId = getShowId(episode)
      const res = await fetch(`/api/v1/shows/${showId}/episodes/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: episode.stage_id }),
      })

      if (!res.ok) throw new Error('Failed to move episode')
      lastConfirmedRef.current = episodes
      onStageChanged?.()
    } catch {
      setEpisodes((prev) =>
        prev.map((ep) =>
          ep.id === episodeId
            ? { ...ep, stage_id: originalEpisode.stage_id, position: originalEpisode.position } as T
            : ep
        )
      )
    }
  }, [episodes, columns, stageIdToColumnId])

  const announcements = {
    onDragStart({ active }: DragStartEvent) {
      const ep = episodes.find((e) => e.id === active.id)
      return `Picked up episode ${ep?.title ?? active.id}`
    },
    onDragOver({ active, over }: DragOverEvent) {
      if (!over) return ''
      const ep = episodes.find((e) => e.id === active.id)
      const col = columns.find((c) => c.id === over.id)
      if (col) return `Episode ${ep?.title} is over ${col.name}`
      const overEp = episodes.find((e) => e.id === over.id)
      return `Episode ${ep?.title} is over ${overEp?.title ?? over.id}`
    },
    onDragEnd({ active, over }: DragEndEvent) {
      const ep = episodes.find((e) => e.id === active.id)
      if (!over) return `Episode ${ep?.title} was dropped`
      const col = columns.find((c) => c.id === over.id)
      return `Episode ${ep?.title} was dropped${col ? ` in ${col.name}` : ''}`
    },
    onDragCancel({ active }: { active: DragStartEvent['active'] }) {
      const ep = episodes.find((e) => e.id === active.id)
      return `Dragging cancelled. Episode ${ep?.title} was dropped.`
    },
  }

  return {
    episodes,
    activeEpisode,
    sensors,
    announcements,
    getEpisodesForColumn,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}
