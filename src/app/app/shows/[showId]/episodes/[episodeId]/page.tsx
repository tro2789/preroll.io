import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EpisodeDetailActions } from './episode-detail-actions'
import { FrameIoPanel } from '@/components/episodes/frameio-panel'

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ showId: string; episodeId: string }>
}) {
  const { showId, episodeId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: episode, error }, { data: deliverables }, { data: integrations }] = await Promise.all([
    supabase
      .from('episodes')
      .select('*, pipeline_stages(id, name, position)')
      .eq('id', episodeId)
      .eq('show_id', showId)
      .single(),
    supabase
      .from('deliverables')
      .select('*')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_integrations')
      .select('provider')
      .eq('user_id', user!.id)
      .eq('provider', 'frame_io'),
  ])

  if (error || !episode) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Episode not found.</p>
        <Link
          href={`/app/shows/${showId}`}
          className="mt-4 inline-block text-sm text-accent hover:text-accent-hover"
        >
          Back to Show
        </Link>
      </div>
    )
  }

  const stage = episode.pipeline_stages as { id: string; name: string; position: number } | null

  return (
    <div>
      <Link
        href={`/app/shows/${showId}`}
        className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
      >
        &larr; Back to Show
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{episode.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {episode.episode_number != null && (
              <span className="inline-flex items-center rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                Episode #{episode.episode_number}
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium text-accent">
              {episode.status}
            </span>
            {stage && (
              <span className="text-sm text-text-tertiary">
                Stage: {stage.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/app/shows/${showId}/episodes/${episodeId}/edit`}
            className="inline-flex items-center rounded-md bg-surface-overlay px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-overlay/80"
          >
            Edit
          </Link>
          <EpisodeDetailActions showId={showId} episodeId={episodeId} />
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {episode.description && (
          <div className="rounded-lg border border-border-subtle bg-surface-raised p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Description</h3>
            <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap">
              {episode.description}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {episode.scheduled_publish_date && (
            <div className="rounded-lg border border-border-subtle bg-surface-raised p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Scheduled Publish Date
              </h3>
              <p className="mt-1 text-sm text-text-primary">
                {episode.scheduled_publish_date}
              </p>
            </div>
          )}

          {episode.published_at && (
            <div className="rounded-lg border border-border-subtle bg-surface-raised p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Published At
              </h3>
              <p className="mt-1 text-sm text-text-primary">
                {new Date(episode.published_at).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {episode.notes && (
          <div className="rounded-lg border border-border-subtle bg-surface-raised p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Notes</h3>
            <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap">
              {episode.notes}
            </p>
          </div>
        )}

        <FrameIoPanel
          episodeId={episodeId}
          showId={showId}
          frameioProjectId={episode.frameio_project_id || null}
          frameioRootFolderId={episode.frameio_root_folder_id || null}
          deliverables={deliverables || []}
          hasFrameIo={(integrations || []).length > 0}
        />
      </div>
    </div>
  )
}
