import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EpisodeDetailActions } from './episode-detail-actions'
import { DeliveryPanel } from '@/components/episodes/delivery-panel'
import type { IntegrationProvider } from '@/lib/integrations/types'

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ showId: string; episodeId: string }>
}) {
  const { showId, episodeId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: episode, error }, { data: deliverables }, { data: episodeIntegration }, { data: connectedProviders }] = await Promise.all([
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
      .from('episode_integrations')
      .select('*')
      .eq('episode_id', episodeId)
      .maybeSingle(),
    supabase
      .from('user_integrations')
      .select('provider')
      .eq('user_id', user!.id),
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

  const providerMeta: Record<string, { displayName: string; acceptedMimeTypes?: string[] }> = {
    frame_io: { displayName: 'Frame.io' },
    google_drive: { displayName: 'Google Drive' },
    vimeo: { displayName: 'Vimeo', acceptedMimeTypes: ['video/*'] },
    dropbox: { displayName: 'Dropbox' },
  }

  const integration = episodeIntegration ? {
    provider: episodeIntegration.provider as IntegrationProvider,
    externalProjectId: episodeIntegration.external_project_id,
    externalFolderId: episodeIntegration.external_folder_id,
    externalViewUrl: episodeIntegration.external_view_url,
    displayName: providerMeta[episodeIntegration.provider]?.displayName || episodeIntegration.provider,
    acceptedMimeTypes: providerMeta[episodeIntegration.provider]?.acceptedMimeTypes,
  } : null

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

      <div className="mt-6">
        <DeliveryPanel
          episodeId={episodeId}
          showId={showId}
          integration={integration}
          deliverables={deliverables || []}
          connectedProviders={(connectedProviders || []).map(p => p.provider as IntegrationProvider)}
          episode={{
            scheduled_publish_date: episode.scheduled_publish_date,
            published_at: episode.published_at,
            description: episode.description,
            notes: episode.notes,
            stage: stage ? { name: stage.name } : null,
          }}
        />
      </div>
    </div>
  )
}
