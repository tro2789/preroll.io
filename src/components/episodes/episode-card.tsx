'use client'

import Link from 'next/link'

interface Episode {
  id: string
  title: string
  episode_number: number | null
  scheduled_publish_date: string | null
  frame_io_url: string | null
  status: string
}

interface EpisodeCardProps {
  episode: Episode
  showId: string
}

export function EpisodeCard({ episode, showId }: EpisodeCardProps) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3 transition-colors hover:border-zinc-600">
      <Link
        href={`/app/shows/${showId}/episodes/${episode.id}`}
        className="block"
      >
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-white leading-tight">
            {episode.title}
          </h4>
          {episode.frame_io_url && (
            <span
              className="shrink-0 text-indigo-400"
              title="Frame.io link available"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M4.75 3A1.75 1.75 0 003 4.75v2.752l.104-.002h13.792c.035 0 .07 0 .104.002V4.75A1.75 1.75 0 0015.25 3H4.75zM3 13.25V9.5h14v3.75A1.75 1.75 0 0115.25 15H4.75A1.75 1.75 0 013 13.25z" />
              </svg>
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          {episode.episode_number != null && (
            <span className="inline-flex items-center rounded-full bg-zinc-700 px-2 py-0.5 text-xs font-medium text-zinc-300">
              #{episode.episode_number}
            </span>
          )}
          {episode.scheduled_publish_date && (
            <span className="text-xs text-zinc-500">
              {episode.scheduled_publish_date}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}
