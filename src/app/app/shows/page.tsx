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
        <h1 className="text-2xl font-bold text-text-primary">Shows</h1>
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
                className="block rounded-lg border border-border-subtle bg-surface-raised p-5 transition-colors hover:border-border-hover"
              >
                <h3 className="text-sm font-semibold text-text-primary">{show.name}</h3>
                {client && (
                  <p className="mt-1 text-xs text-text-tertiary">{client.name}</p>
                )}
                <div className="mt-3 flex items-center gap-3 text-xs text-text-secondary">
                  {show.format && (
                    <span className="inline-flex items-center rounded-full bg-accent-muted px-2 py-0.5 text-xs text-accent">
                      {show.format}
                    </span>
                  )}
                  <span>{episodeCount} {episodeCount === 1 ? 'episode' : 'episodes'}</span>
                </div>
                {show.schedule && (
                  <p className="mt-2 text-xs text-text-tertiary">{show.schedule}</p>
                )}
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-border-subtle bg-surface-raised p-8 text-center">
          <p className="text-text-secondary">No shows yet. Start with a client.</p>
          <Link
            href="/app/clients"
            className="mt-3 inline-block text-sm text-accent hover:text-accent-hover"
          >
            Go to Clients
          </Link>
        </div>
      )}
    </div>
  )
}
