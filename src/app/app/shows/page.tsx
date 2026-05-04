import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function ShowsPage() {
  const supabase = await createClient()

  const { data: shows } = await supabase
    .from('shows')
    .select('id, name, format, schedule, clients(id, name), episodes(id)')
    .order('name')

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Shows</h1>
      </div>

      {shows && shows.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shows.map((show) => {
            const clients = show.clients as unknown as { id: string; name: string } | { id: string; name: string }[] | null
            const client = Array.isArray(clients) ? clients[0] : clients
            const episodeCount = (show.episodes as { id: string }[] | null)?.length ?? 0
            return (
              <Link
                key={show.id}
                href={`/app/shows/${show.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-800/50 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
              >
                <h3 className="text-sm font-semibold text-white">{show.name}</h3>
                {client && (
                  <p className="mt-1 text-xs text-zinc-500">{client.name}</p>
                )}
                <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
                  {show.format && (
                    <span className="inline-flex items-center rounded-full bg-indigo-900/50 px-2 py-0.5 text-xs text-indigo-300 border border-indigo-700/50">
                      {show.format}
                    </span>
                  )}
                  <span>{episodeCount} {episodeCount === 1 ? 'episode' : 'episodes'}</span>
                </div>
                {show.schedule && (
                  <p className="mt-2 text-xs text-zinc-500">{show.schedule}</p>
                )}
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-800/50 p-8 text-center">
          <p className="text-zinc-400">No shows yet. Add a client first, then create a show.</p>
          <Link
            href="/app/clients"
            className="mt-3 inline-block text-sm text-indigo-400 hover:text-indigo-300"
          >
            Go to Clients
          </Link>
        </div>
      )}
    </div>
  )
}
