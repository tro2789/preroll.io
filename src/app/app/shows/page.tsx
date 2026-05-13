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
      <PageHeader
        title="Shows"
        description="Every show you produce, grouped by client."
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 py-3.5 sticky top-12 z-10 bg-surface-base">
        <span className="inline-flex items-center gap-1.5 px-[9px] py-1 rounded-[7px] text-[12.5px] text-text-secondary border border-border-subtle bg-surface-input hover:border-border-default hover:text-text-primary transition-colors cursor-pointer">
          <svg className="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
          Client
          <svg className="w-[11px] h-[11px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m6 9 6 6 6-6" /></svg>
        </span>
        <div className="flex-1" />
        <span className="inline-flex items-center gap-[7px] px-[9px] py-1 rounded-[7px] text-[12.5px] text-text-tertiary border border-border-subtle bg-surface-input">
          <svg className="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          Search shows…
        </span>
      </div>

      {shows && shows.length > 0 ? (
        <div className="grid gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
          {shows.map((show) => {
            const clients = show.clients as unknown as { id: string; name: string } | { id: string; name: string }[] | null
            const client = Array.isArray(clients) ? clients[0] : clients
            const episodeCount = (show.episodes as { id: string }[] | null)?.length ?? 0
            return (
              <Link
                key={show.id}
                href={`/app/shows/${show.id}`}
                className="block rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden transition-all hover:border-border-strong cursor-pointer"
              >
                <Thumbnail id={show.id} imageUrl={resolveImageUrl(show.cover_art_url)} className="aspect-[16/8]" />
                <div className="px-3.5 py-[13px]">
                  <h3 className="text-[14px] font-semibold text-text-primary">{show.name}</h3>
                  <p className="mt-[3px] text-xs text-text-tertiary">
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
