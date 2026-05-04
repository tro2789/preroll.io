import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EpisodeTimeline } from '@/components/portal/episode-timeline'
import { ActivityFeed } from '@/components/portal/activity-feed'

export default async function PortalShowPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: show } = await supabase
    .from('shows')
    .select('id, name, description, format')
    .eq('id', showId)
    .single()

  if (!show) redirect('/portal')

  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, title, episode_number, status, scheduled_publish_date, stage_id, pipeline_stages(name)')
    .eq('show_id', showId)
    .order('episode_number', { ascending: true, nullsFirst: false })

  const episodesWithPending = await Promise.all(
    (episodes || []).map(async (ep) => {
      const { count } = await supabase
        .from('deliverables')
        .select('*', { count: 'exact', head: true })
        .eq('episode_id', ep.id)
        .eq('status', 'pending')

      const stageRaw = ep.pipeline_stages as unknown
      const stage = (Array.isArray(stageRaw) ? stageRaw[0] : stageRaw) as { name: string } | null
      return {
        id: ep.id,
        title: ep.title,
        episode_number: ep.episode_number,
        status: ep.status,
        scheduled_publish_date: ep.scheduled_publish_date,
        stage,
        pendingCount: count || 0,
      }
    })
  )

  const [{ count: showPendingCount }, { data: activities }] = await Promise.all([
    supabase
      .from('deliverables')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', showId)
      .is('episode_id', null)
      .eq('status', 'pending'),
    supabase
      .from('activity_log')
      .select('*')
      .eq('show_id', showId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">{show.name}</h1>
        {show.description && (
          <p className="text-sm text-text-secondary mt-1">{show.description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href={`/portal/shows/${showId}/assets`}
          className="text-sm text-accent hover:text-accent-hover transition-colors"
        >
          Brand assets
          {(showPendingCount || 0) > 0 && (
            <span className="ml-1.5 rounded-full bg-accent/15 text-accent text-xs font-medium px-2 py-0.5">
              {showPendingCount} pending
            </span>
          )}
        </Link>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-text-secondary">Episodes</h2>
        <EpisodeTimeline episodes={episodesWithPending} showId={showId} />
      </div>

      {activities && activities.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-secondary">Recent Activity</h2>
          <div className="rounded-lg bg-surface-raised border border-border-subtle p-4">
            <ActivityFeed activities={activities} />
          </div>
        </div>
      )}
    </div>
  )
}
