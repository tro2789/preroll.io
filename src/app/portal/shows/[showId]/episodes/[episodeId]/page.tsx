import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DeliverableCard } from '@/components/portal/deliverable-card'

export default async function PortalEpisodePage({
  params,
}: {
  params: Promise<{ showId: string; episodeId: string }>
}) {
  const { showId, episodeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: show } = await supabase
    .from('shows')
    .select('id, name')
    .eq('id', showId)
    .single()

  if (!show) redirect('/portal')

  const { data: episode } = await supabase
    .from('episodes')
    .select('*, pipeline_stages(name)')
    .eq('id', episodeId)
    .eq('show_id', showId)
    .single()

  if (!episode) redirect(`/portal/shows/${showId}`)

  const { data: deliverables } = await supabase
    .from('deliverables')
    .select('*')
    .eq('episode_id', episodeId)
    .order('created_at', { ascending: false })

  const stage = episode.pipeline_stages as { name: string } | null

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
          <span className="text-xs text-text-secondary">
            {stage?.name || episode.status}
          </span>
          {episode.scheduled_publish_date && (
            <>
              <span className="text-border-default">&middot;</span>
              <span className="text-xs text-text-tertiary">
                Scheduled: {new Date(episode.scheduled_publish_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </>
          )}
        </div>

        {episode.description && (
          <p className="text-sm text-text-secondary mt-3">{episode.description}</p>
        )}
      </div>

      {episode.frame_io_url && (
        <div className="rounded-lg bg-surface-raised border border-border-subtle p-4">
          <a
            href={episode.frame_io_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent hover:text-accent-hover transition-colors font-medium"
          >
            Open in Frame.io &rarr;
          </a>
        </div>
      )}

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
    </div>
  )
}
