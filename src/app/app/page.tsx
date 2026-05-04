import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { resolveImageUrl } from '@/lib/r2/client'
import { Thumbnail } from '@/components/ui/thumbnail'
import { StatsBar } from '@/components/dashboard/stats-bar'
import { AttentionList } from '@/components/dashboard/attention-list'
import { DashboardActivityFeed } from '@/components/dashboard/activity-feed'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <p className="text-text-tertiary">Loading...</p>
  }

  const today = new Date()
  const nextTwoWeeks = new Date(today.getTime() + 14 * 86400000)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const todayStr = today.toISOString().split('T')[0]
  const nextTwoWeeksStr = nextTwoWeeks.toISOString().split('T')[0]

  const [
    showsResult,
    inProgressResult,
    deadlinesResult,
    activityResult,
    clientCountResult,
    showCountResult,
    episodesThisMonthResult,
    pendingDeliverablesResult,
  ] = await Promise.all([
    supabase
      .from('shows')
      .select('id, name, cover_art_url, clients(name), episodes(id)')
      .order('name'),

    supabase
      .from('episodes')
      .select('id, title, episode_number, status, scheduled_publish_date, updated_at, pipeline_stages(name), shows(id, name)')
      .neq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(8),

    supabase
      .from('episodes')
      .select('id, title, episode_number, status, scheduled_publish_date, pipeline_stages(name), shows(id, name)')
      .gte('scheduled_publish_date', todayStr)
      .lte('scheduled_publish_date', nextTwoWeeksStr)
      .neq('status', 'published')
      .order('scheduled_publish_date', { ascending: true })
      .limit(6),

    supabase
      .from('activity_log')
      .select('id, action, description, created_at, shows(name)')
      .order('created_at', { ascending: false })
      .limit(8),

    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('shows').select('*', { count: 'exact', head: true }),
    supabase.from('episodes').select('*', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString()),
    supabase.from('deliverables').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const shows = showsResult.data || []
  const inProgress = inProgressResult.data || []
  const deadlines = deadlinesResult.data || []
  const activities = activityResult.data || []

  const stats = {
    client_count: clientCountResult.count ?? 0,
    show_count: showCountResult.count ?? 0,
    episodes_this_month: episodesThisMonthResult.count ?? 0,
    pending_deliverables: pendingDeliverablesResult.count ?? 0,
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <div className="mt-4">
          <StatsBar stats={stats} />
        </div>
      </div>

      {shows.length > 0 && (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-3">Shows</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {shows.map((show) => {
              const client = show.clients as unknown as { name: string } | { name: string }[] | null
              const clientName = Array.isArray(client) ? client[0]?.name : client?.name
              const episodeCount = (show.episodes as { id: string }[] | null)?.length ?? 0
              return (
                <Link
                  key={show.id}
                  href={`/app/shows/${show.id}`}
                  className="rounded-lg border border-border-subtle bg-surface-raised overflow-hidden transition-colors hover:border-border-default group"
                >
                  <Thumbnail id={show.id} imageUrl={resolveImageUrl(show.cover_art_url)} className="aspect-[16/9]" />
                  <div className="p-3">
                    <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                      {show.name}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {clientName && <>{clientName} &middot; </>}{episodeCount} ep
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AttentionList
          title="In Progress"
          episodes={inProgress}
          emptyMessage="All caught up."
        />
        <AttentionList
          title="Upcoming Deadlines"
          episodes={deadlines}
          emptyMessage="No deadlines in the next 2 weeks."
        />
      </div>

      {activities.length > 0 && (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-3">Recent Activity</h2>
          <DashboardActivityFeed activities={activities} />
        </div>
      )}
    </div>
  )
}
