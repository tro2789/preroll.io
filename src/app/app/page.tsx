import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { QuickCreate } from '@/components/dashboard/quick-create'

const stageColors: Record<string, string> = {
  planning: 'bg-sky-500/15 text-sky-400',
  recording: 'bg-violet-500/15 text-violet-400',
  editing: 'bg-amber-500/15 text-amber-400',
  review: 'bg-orange-500/15 text-orange-400',
  approved: 'bg-emerald-500/15 text-emerald-400',
  published: 'bg-emerald-500/15 text-emerald-400',
}

const producerStages = ['planning', 'recording', 'editing', 'approved']

function timeAtStage(updatedAt: string): string {
  const diff = Date.now() - new Date(updatedAt).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d'
  return `${days}d`
}

function formatScheduledDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0]

  if (dateStr === todayStr) return 'Today'
  if (dateStr === tomorrowStr) return 'Tomorrow'

  const diff = Math.ceil((date.getTime() - now.getTime()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff <= 7) return `in ${diff}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <p className="text-text-tertiary">Loading...</p>
  }

  const [attentionResult, recentResult] = await Promise.all([
    supabase
      .from('episodes')
      .select('id, title, episode_number, status, scheduled_publish_date, updated_at, pipeline_stages(name), shows(id, name)')
      .in('status', producerStages)
      .order('updated_at', { ascending: true })
      .limit(12),

    supabase
      .from('episodes')
      .select('id, title, episode_number, status, pipeline_stages(name), shows(id, name)')
      .order('updated_at', { ascending: false })
      .limit(6),
  ])

  const attentionEpisodes = attentionResult.data || []
  const recentEpisodes = recentResult.data || []

  // Deduplicate: remove recent items that already appear in attention
  const attentionIds = new Set(attentionEpisodes.map(e => e.id))
  const recentFiltered = recentEpisodes.filter(e => !attentionIds.has(e.id))

  const hasNoShows = attentionEpisodes.length === 0 && recentEpisodes.length === 0

  return (
    <div>
      <div className="flex items-center justify-between">
        <div />
        <QuickCreate />
      </div>

      <div className="mt-6 space-y-8">
        {/* Needs Attention */}
        <section>
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-3">Needs Attention</h2>

          {hasNoShows ? (
            <p className="text-sm text-text-tertiary py-8">No episodes yet. Create a show and add your first episode to get started.</p>
          ) : attentionEpisodes.length === 0 ? (
            <p className="text-sm text-text-tertiary py-4">Nothing needs your attention right now.</p>
          ) : (
            <div className="space-y-px">
              {attentionEpisodes.map((episode) => {
                const stageRaw = episode.pipeline_stages as unknown
                const stage = (Array.isArray(stageRaw) ? stageRaw[0] : stageRaw) as { name: string } | null
                const stageName = stage?.name || episode.status
                const stageClass = stageColors[episode.status] || stageColors.planning
                const showRaw = episode.shows as unknown
                const show = (Array.isArray(showRaw) ? showRaw[0] : showRaw) as { id: string; name: string } | null
                const isOverdue = episode.scheduled_publish_date && episode.scheduled_publish_date < new Date().toISOString().split('T')[0] && episode.status !== 'published'

                return (
                  <Link
                    key={episode.id}
                    href={`/app/shows/${show?.id}/episodes/${episode.id}`}
                    className="flex items-center gap-3 rounded px-3 py-2.5 transition-colors hover:bg-surface-overlay group"
                  >
                    <span className={`shrink-0 text-[10px] font-semibold uppercase w-[72px] text-center px-2 py-0.5 rounded-full ${stageClass}`}>
                      {stageName}
                    </span>

                    <span className="text-sm text-text-primary group-hover:text-accent transition-colors truncate min-w-0 flex-1">
                      {episode.title}
                    </span>

                    <span className="shrink-0 text-xs text-text-tertiary hidden sm:block">
                      {show?.name}
                    </span>

                    {episode.scheduled_publish_date && (
                      <span className={`shrink-0 text-xs tabular-nums ${isOverdue ? 'text-red-400 font-medium' : 'text-text-tertiary'}`}>
                        {formatScheduledDate(episode.scheduled_publish_date)}
                      </span>
                    )}

                    {episode.updated_at && !episode.scheduled_publish_date && (
                      <span className="shrink-0 text-xs text-text-tertiary tabular-nums">
                        {timeAtStage(episode.updated_at)}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Recent */}
        {recentFiltered.length > 0 && (
          <section>
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-3">Recent</h2>
            <div className="space-y-px">
              {recentFiltered.slice(0, 5).map((episode) => {
                const stageRaw = episode.pipeline_stages as unknown
                const stage = (Array.isArray(stageRaw) ? stageRaw[0] : stageRaw) as { name: string } | null
                const stageName = stage?.name || episode.status
                const stageClass = stageColors[episode.status] || stageColors.planning
                const showRaw = episode.shows as unknown
                const show = (Array.isArray(showRaw) ? showRaw[0] : showRaw) as { id: string; name: string } | null

                return (
                  <Link
                    key={episode.id}
                    href={`/app/shows/${show?.id}/episodes/${episode.id}`}
                    className="flex items-center gap-3 rounded px-3 py-2 transition-colors hover:bg-surface-overlay group"
                  >
                    <span className={`shrink-0 text-[10px] font-semibold uppercase w-[72px] text-center px-2 py-0.5 rounded-full ${stageClass}`}>
                      {stageName}
                    </span>

                    <span className="text-sm text-text-primary group-hover:text-accent transition-colors truncate min-w-0 flex-1">
                      {episode.title}
                    </span>

                    <span className="shrink-0 text-xs text-text-tertiary hidden sm:block">
                      {show?.name}
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
