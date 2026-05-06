import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { QuickCreate } from '@/components/dashboard/quick-create'

const stages = ['planning', 'recording', 'editing', 'review', 'approved'] as const

const stageLabels: Record<string, string> = {
  planning: 'Planning',
  recording: 'Recording',
  editing: 'Editing',
  review: 'Review',
  approved: 'Approved',
}

const stageHeaderColors: Record<string, string> = {
  planning: 'text-sky-400',
  recording: 'text-violet-400',
  editing: 'text-amber-400',
  review: 'text-orange-400',
  approved: 'text-emerald-400',
}

const stageDotColors: Record<string, string> = {
  planning: 'bg-sky-400',
  recording: 'bg-violet-400',
  editing: 'bg-amber-400',
  review: 'bg-orange-400',
  approved: 'bg-emerald-400',
}

interface Episode {
  id: string
  title: string
  episode_number: number | null
  status: string
  scheduled_publish_date: string | null
  updated_at: string
  pipeline_stages: unknown
  shows: unknown
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  if (dateStr === todayStr) return 'Today'
  if (dateStr < todayStr) return 'Overdue'

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <p className="text-text-tertiary">Loading...</p>
  }

  const [episodesResult, recentResult] = await Promise.all([
    supabase
      .from('episodes')
      .select('id, title, episode_number, status, scheduled_publish_date, updated_at, pipeline_stages(name), shows(id, name)')
      .in('status', stages as unknown as string[])
      .order('updated_at', { ascending: true }),

    supabase
      .from('episodes')
      .select('id, title, status, pipeline_stages(name), shows(id, name)')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(5),
  ])

  const allEpisodes = (episodesResult.data || []) as Episode[]
  const recentPublished = (recentResult.data || []) as Episode[]

  const columns: Record<string, Episode[]> = {}
  for (const s of stages) columns[s] = []
  for (const ep of allEpisodes) {
    if (columns[ep.status]) columns[ep.status].push(ep)
  }

  const hasAnyEpisodes = allEpisodes.length > 0 || recentPublished.length > 0

  return (
    <div>
      <div className="flex items-center justify-between">
        <div />
        <QuickCreate />
      </div>

      {!hasAnyEpisodes && (
        <p className="text-sm text-text-tertiary py-12 text-center">No episodes yet. Create a show and add your first episode to get started.</p>
      )}

      {hasAnyEpisodes && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 160px)' }}>
          {stages.map((stage) => {
            const episodes = columns[stage]
            return (
              <div key={stage} className="shrink-0 w-56 flex flex-col">
                <div className="flex items-center gap-2 px-1 pb-3">
                  <span className={`h-2 w-2 rounded-full ${stageDotColors[stage]}`} />
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${stageHeaderColors[stage]}`}>
                    {stageLabels[stage]}
                  </h3>
                  {episodes.length > 0 && (
                    <span className="text-xs text-text-tertiary">{episodes.length}</span>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  {episodes.map((episode) => {
                    const showRaw = episode.shows as unknown
                    const show = (Array.isArray(showRaw) ? showRaw[0] : showRaw) as { id: string; name: string } | null
                    const isOverdue = episode.scheduled_publish_date && episode.scheduled_publish_date < new Date().toISOString().split('T')[0]

                    return (
                      <Link
                        key={episode.id}
                        href={`/app/shows/${show?.id}/episodes/${episode.id}`}
                        className="block rounded-lg border border-border-subtle bg-surface-raised px-3 py-2.5 transition-colors hover:border-border-default group"
                      >
                        <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors leading-snug">
                          {episode.title}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-text-tertiary truncate">{show?.name}</span>
                          {episode.scheduled_publish_date && (
                            <span className={`shrink-0 text-[11px] tabular-nums ${isOverdue ? 'text-red-400 font-medium' : 'text-text-tertiary'}`}>
                              {formatDate(episode.scheduled_publish_date)}
                            </span>
                          )}
                        </div>
                      </Link>
                    )
                  })}

                  {episodes.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border-subtle px-3 py-6 text-center">
                      <p className="text-xs text-text-tertiary">No episodes</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {recentPublished.length > 0 && (
        <section className="mt-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-2">Recently Published</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {recentPublished.map((episode) => {
              const showRaw = episode.shows as unknown
              const show = (Array.isArray(showRaw) ? showRaw[0] : showRaw) as { id: string; name: string } | null
              return (
                <Link
                  key={episode.id}
                  href={`/app/shows/${show?.id}/episodes/${episode.id}`}
                  className="text-xs text-text-tertiary hover:text-accent transition-colors py-1"
                >
                  {episode.title} <span className="text-text-tertiary/60">{show?.name}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
