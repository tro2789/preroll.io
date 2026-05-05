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
  const hasFrameIo = (integrations || []).length > 0

  const statusColors: Record<string, string> = {
    planning: 'bg-sky-500/15 text-sky-400',
    recording: 'bg-violet-500/15 text-violet-400',
    editing: 'bg-amber-500/15 text-amber-400',
    review: 'bg-orange-500/15 text-orange-400',
    approved: 'bg-emerald-500/15 text-emerald-400',
    published: 'bg-emerald-500/15 text-emerald-400',
  }

  return (
    <div>
      <Link
        href={`/app/shows/${showId}`}
        className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
      >
        &larr; Back to Show
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-text-primary leading-tight">{episode.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {episode.episode_number != null && (
              <span className="text-xs text-text-tertiary">
                EP {String(episode.episode_number).padStart(2, '0')}
              </span>
            )}
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[episode.status] || 'bg-surface-overlay text-text-secondary'}`}>
              {stage?.name || episode.status}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/app/shows/${showId}/episodes/${episodeId}/edit`}
            className="rounded-md bg-surface-overlay border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-border-hover"
          >
            Edit
          </Link>
          <EpisodeDetailActions showId={showId} episodeId={episodeId} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main content: Frame.io panel */}
        <div className="min-w-0">
          <FrameIoPanel
            episodeId={episodeId}
            showId={showId}
            frameioProjectId={episode.frameio_project_id || null}
            frameioRootFolderId={episode.frameio_root_folder_id || null}
            deliverables={deliverables || []}
            hasFrameIo={hasFrameIo}
          />
        </div>

        {/* Sidebar: episode metadata */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="space-y-3">
            {episode.scheduled_publish_date && (
              <div>
                <h4 className="text-xs font-medium text-text-tertiary">Publish Date</h4>
                <p className="mt-0.5 text-sm text-text-primary">{episode.scheduled_publish_date}</p>
              </div>
            )}

            {episode.published_at && (
              <div>
                <h4 className="text-xs font-medium text-text-tertiary">Published</h4>
                <p className="mt-0.5 text-sm text-text-primary">
                  {new Date(episode.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}

            {stage && (
              <div>
                <h4 className="text-xs font-medium text-text-tertiary">Pipeline Stage</h4>
                <p className="mt-0.5 text-sm text-text-primary">{stage.name}</p>
              </div>
            )}
          </div>

          {episode.description && (
            <div>
              <h4 className="text-xs font-medium text-text-tertiary">Description</h4>
              <p className="mt-1 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap line-clamp-6">
                {episode.description}
              </p>
            </div>
          )}

          {episode.notes && (
            <div>
              <h4 className="text-xs font-medium text-text-tertiary">Notes</h4>
              <p className="mt-1 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap line-clamp-6">
                {episode.notes}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
