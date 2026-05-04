'use client'

import { useState } from 'react'
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
  status: string
  stage_id: string | null
}

interface PipelineBoardProps {
  showId: string
  stages: Stage[]
  episodes: Episode[]
}

export function PipelineBoard({ showId, stages, episodes: initialEpisodes }: PipelineBoardProps) {
  const [episodes, setEpisodes] = useState<Episode[]>(initialEpisodes)
  const [movingEpisodeId, setMovingEpisodeId] = useState<string | null>(null)

  async function handleMoveEpisode(episodeId: string, newStageId: string) {
    const episode = episodes.find((ep) => ep.id === episodeId)
    if (!episode || episode.stage_id === newStageId) return

    const previousStageId = episode.stage_id
    setMovingEpisodeId(episodeId)

    // Optimistic update
    setEpisodes((prev) =>
      prev.map((ep) =>
        ep.id === episodeId ? { ...ep, stage_id: newStageId } : ep
      )
    )

    try {
      const res = await fetch(`/api/v1/shows/${showId}/episodes/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: newStageId }),
      })

      if (!res.ok) {
        throw new Error('Failed to move episode')
      }
    } catch {
      // Revert on error
      setEpisodes((prev) =>
        prev.map((ep) =>
          ep.id === episodeId ? { ...ep, stage_id: previousStageId } : ep
        )
      )
    } finally {
      setMovingEpisodeId(null)
    }
  }

  const sortedStages = [...stages].sort((a, b) => a.position - b.position)

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {sortedStages.map((stage) => {
        const stageEpisodes = episodes.filter((ep) => ep.stage_id === stage.id)
        return (
          <div
            key={stage.id}
            className="flex min-w-0 flex-col rounded-lg bg-zinc-800/50 border border-zinc-800"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-200">
                {stage.name}
              </h3>
              <span className="inline-flex items-center rounded-full bg-zinc-700 px-2 py-0.5 text-xs font-medium text-zinc-400">
                {stageEpisodes.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-3 min-h-[120px]">
              {stageEpisodes.map((episode) => (
                <div key={episode.id}>
                  <EpisodeCard episode={episode} showId={showId} />
                  <select
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-400 focus:border-indigo-500 focus:outline-none"
                    value={episode.stage_id ?? ''}
                    onChange={(e) =>
                      handleMoveEpisode(episode.id, e.target.value)
                    }
                    disabled={movingEpisodeId === episode.id}
                  >
                    {sortedStages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id === stage.id ? `${s.name} (current)` : `Move to ${s.name}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {stageEpisodes.length === 0 && (
                <p className="text-xs text-zinc-600 text-center py-4">
                  No episodes
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
