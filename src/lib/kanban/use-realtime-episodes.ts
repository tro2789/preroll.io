import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { KanbanEpisode } from './types'

interface UseRealtimeEpisodesOptions<T extends KanbanEpisode> {
  showId?: string
  isDragging: boolean
  onInsert: (episode: T) => void
  onUpdate: (episode: T) => void
  onDelete: (episodeId: string) => void
}

export function useRealtimeEpisodes<T extends KanbanEpisode>({
  showId,
  isDragging,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeEpisodesOptions<T>) {
  const queueRef = useRef<RealtimePostgresChangesPayload<Record<string, unknown>>[]>([])
  const isDraggingRef = useRef(isDragging)
  isDraggingRef.current = isDragging

  const callbacksRef = useRef({ onInsert, onUpdate, onDelete })
  callbacksRef.current = { onInsert, onUpdate, onDelete }

  const processEvent = useCallback((payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
    const { onInsert, onUpdate, onDelete } = callbacksRef.current
    switch (payload.eventType) {
      case 'INSERT':
        onInsert(payload.new as unknown as T)
        break
      case 'UPDATE':
        onUpdate(payload.new as unknown as T)
        break
      case 'DELETE':
        if (payload.old && 'id' in payload.old) {
          onDelete(payload.old.id as string)
        }
        break
    }
  }, [])

  useEffect(() => {
    if (!isDragging && queueRef.current.length > 0) {
      const events = queueRef.current.splice(0)
      for (const event of events) {
        processEvent(event)
      }
    }
  }, [isDragging, processEvent])

  useEffect(() => {
    const supabase = createClient()

    const filter = showId ? `show_id=eq.${showId}` : undefined
    const channelName = showId ? `episodes:${showId}` : 'episodes:all'

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'episodes',
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          if (isDraggingRef.current) {
            queueRef.current.push(payload)
          } else {
            processEvent(payload)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showId, processEvent])
}
