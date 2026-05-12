import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { resolveImageUrl } from '@/lib/r2/client'
import { getActiveOrgId } from '@/lib/org/server'
import { Thumbnail } from '@/components/ui/thumbnail'
import { PageHeader } from '@/components/layout/page-header'

export default async function ShowsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const orgId = user ? await getActiveOrgId(user.id) : null

  const { data: shows } = await supabase
    .from('shows')
    .select('id, name, format, schedule, cover_art_url, clients!inner(id, name, org_id), episodes(id)')
    .eq('clients.org_id', orgId!)
    .order('name')

  return (
    <div>
      <PageHeader title="Shows" description="All shows across your clients" />

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
                className="block rounded-lg border border-border-subtle bg-surface-raised overflow-hidden transition-colors hover:border-border-hover"
              >
                <Thumbnail id={show.id} imageUrl={resolveImageUrl(show.cover_art_url)} className="aspect-[16/9]" />
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-text-primary">{show.name}</h3>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {client && <>{client.name} &middot; </>}{episodeCount} {episodeCount === 1 ? 'episode' : 'episodes'}
                  </p>
                </div>
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
