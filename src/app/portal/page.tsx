import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { resolveImageUrl } from '@/lib/r2/client'
import { Thumbnail } from '@/components/ui/thumbnail'
import { WelcomeCard } from '@/components/portal/welcome-card'
import { resolvePortalClient } from '@/lib/portal/resolve'

export default async function PortalDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { client } = await resolvePortalClient(supabase, user.id)
  if (!client) redirect('/login')

  const { data: shows } = await supabase
    .from('shows')
    .select('id, name, cover_art_url, episodes(id)')
    .eq('client_id', client.id)
    .order('name')

  if (!shows || shows.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary">No shows yet. Your producer will set things up soon.</p>
      </div>
    )
  }

  if (shows.length === 1) {
    redirect(`/portal/shows/${shows[0].id}`)
  }

  const showIds = shows.map((s) => s.id)
  const { data: pendingRows } = await supabase
    .from('deliverables')
    .select('show_id')
    .in('show_id', showIds)
    .eq('status', 'pending')

  const pendingByShow = new Map<string, number>()
  for (const row of pendingRows ?? []) {
    pendingByShow.set(row.show_id, (pendingByShow.get(row.show_id) ?? 0) + 1)
  }

  const showsWithPending = shows.map((show) => ({
    ...show,
    pendingCount: pendingByShow.get(show.id) ?? 0,
  }))

  const orgDisplayName = client.organizations?.display_name || undefined

  return (
    <div className="space-y-6">
      {!client.portal_welcome_dismissed_at && (
        <WelcomeCard orgDisplayName={orgDisplayName} />
      )}
      <p className="text-lg text-text-primary">
        Welcome back, <span className="font-semibold">{client.name.split(' ')[0]}</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {showsWithPending.map((show) => {
          const episodes = show.episodes as { id: string }[]
          return (
            <Link
              key={show.id}
              href={`/portal/shows/${show.id}`}
              className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden hover:border-border-default transition-colors group"
            >
              <Thumbnail
                id={show.id}
                imageUrl={resolveImageUrl(show.cover_art_url)}
                className="aspect-[3/1]"
              />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-medium text-text-primary group-hover:text-accent transition-colors">
                      {show.name}
                    </h2>
                  </div>
                  {show.pendingCount > 0 && (
                    <span className="rounded-full bg-accent/15 text-accent text-xs font-medium px-2 py-0.5">
                      {show.pendingCount} pending
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary mt-3">
                  {episodes.length} episode{episodes.length !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
