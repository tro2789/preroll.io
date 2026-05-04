import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function PortalDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('client_user_id', user.id)
    .single()

  if (!client) redirect('/login')

  const { data: shows } = await supabase
    .from('shows')
    .select('id, name, format, description, episodes(id)')
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

  const showsWithPending = await Promise.all(
    shows.map(async (show) => {
      const { count } = await supabase
        .from('deliverables')
        .select('*', { count: 'exact', head: true })
        .eq('show_id', show.id)
        .eq('status', 'pending')
      return { ...show, pendingCount: count || 0 }
    })
  )

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-text-primary">My Shows</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {showsWithPending.map((show) => {
          const episodes = show.episodes as { id: string }[]
          return (
            <Link
              key={show.id}
              href={`/portal/shows/${show.id}`}
              className="rounded-lg bg-surface-raised border border-border-subtle p-5 hover:border-border-default transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-medium text-text-primary group-hover:text-accent transition-colors">
                    {show.name}
                  </h2>
                  {show.format && (
                    <p className="text-xs text-text-tertiary mt-1">{show.format}</p>
                  )}
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
            </Link>
          )
        })}
      </div>
    </div>
  )
}
