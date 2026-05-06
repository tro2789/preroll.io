import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DeliverableCard } from '@/components/portal/deliverable-card'
import { PipelineProgress } from '@/components/portal/pipeline-progress'

export default async function PortalEpisodePage({
  params,
}: {
  params: Promise<{ showId: string; episodeId: string }>
}) {
  const { showId, episodeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: show },
    { data: episode },
    { data: stages },
    { data: deliverables },
  ] = await Promise.all([
    supabase
      .from('shows')
      .select('id, name')
      .eq('id', showId)
      .single(),
    supabase
      .from('episodes')
      .select('id, title, episode_number, status, stage_id, scheduled_publish_date, description')
      .eq('id', episodeId)
      .eq('show_id', showId)
      .single(),
    supabase
      .from('pipeline_stages')
      .select('id, name, position')
      .eq('show_id', showId)
      .order('position', { ascending: true }),
    supabase
      .from('deliverables')
      .select('*')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false }),
  ])

  if (!show) redirect('/portal')
  if (!episode) redirect(`/portal/shows/${showId}`)

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/portal/shows/${showId}`}
          className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          &larr; {show.name}
        </Link>

        <div className="mt-3 flex items-center gap-3">
          {episode.episode_number != null && (
            <span className="text-sm font-mono text-text-tertiary">#{episode.episode_number}</span>
          )}
          <h1 className="text-lg font-semibold text-text-primary">{episode.title}</h1>
        </div>

        <div className="flex items-center gap-3 mt-2">
          {episode.scheduled_publish_date && (
            <span className="text-xs text-text-tertiary">
              Scheduled: {new Date(episode.scheduled_publish_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>

        {stages && stages.length > 0 && (
          <div className="mt-5">
            <PipelineProgress stages={stages} currentStageId={episode.stage_id} />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-text-secondary">
          Deliverables
          {deliverables && deliverables.length > 0 && (
            <span className="ml-2 text-text-tertiary font-normal">({deliverables.length})</span>
          )}
        </h2>

        {!deliverables || deliverables.length === 0 ? (
          <p className="text-sm text-text-tertiary py-4 text-center">
            No deliverables yet for this episode.
          </p>
        ) : (
          <div className="space-y-3">
            {deliverables.map((d) => (
              <DeliverableCard key={d.id} deliverable={d} />
            ))}
          </div>
        )}
      </div>

      {episode.description && (
        <section>
          <h2 className="text-sm font-medium text-text-secondary mb-3">Notes</h2>
          <div className="rounded-lg bg-surface-raised border border-border-subtle p-4">
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{episode.description}</p>
          </div>
        </section>
      )}
    </div>
  )
}
