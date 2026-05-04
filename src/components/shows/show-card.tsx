import Link from 'next/link'

interface Show {
  id: string
  name: string
  format?: string | null
  schedule?: string | null
  episode_count?: number
}

export function ShowCard({ show }: { show: Show }) {
  return (
    <Link
      href={`/app/shows/${show.id}`}
      className="block rounded-lg border border-zinc-800 bg-zinc-800/50 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
    >
      <h3 className="text-base font-semibold text-white">{show.name}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {show.format && (
          <span className="inline-flex items-center rounded-full bg-indigo-900/50 px-2.5 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-700/50">
            {show.format}
          </span>
        )}
        {show.schedule && (
          <span className="text-xs text-zinc-400">{show.schedule}</span>
        )}
      </div>
      {typeof show.episode_count === 'number' && (
        <p className="mt-2 text-xs text-zinc-500">
          {show.episode_count} {show.episode_count === 1 ? 'episode' : 'episodes'}
        </p>
      )}
    </Link>
  )
}
