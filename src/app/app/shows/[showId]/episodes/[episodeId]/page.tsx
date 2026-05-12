import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EpisodeDetailActions } from './episode-detail-actions'
import { PublishButton } from './publish-button'
import { EpisodeDetailContent } from './episode-detail-content'
import { AiPanel } from '@/components/episodes/ai-panel'
import type { IntegrationProvider } from '@/lib/integrations/types'

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ showId: string; episodeId: string }>
}) {
  const { showId, episodeId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: episode, error }, { data: deliverables }, { data: episodeIntegration }, { data: connectedProviders }, { data: distributionConnections }, { data: audioFileRefs }] = await Promise.all([
    supabase
      .from('episodes')
      .select('*, pipeline_stages(id, name, position), shows(name, clients(id, name, email, invite_code, client_user_id, onboarded_at))')
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
    supabase
      .from('distribution_connections')
      .select('id, provider')
      .eq('show_id', showId),
    supabase
      .from('file_references')
      .select('id, mime_type')
      .eq('episode_id', episodeId)
      .limit(10),
  ])

  if (error || !episode) {
    return (
      <div className="text-center py-12">
        <p className="text-text-primary">Episode not found.</p>
        <Link href={`/app/shows/${showId}`} className="mt-4 inline-block text-sm text-accent hover:text-accent-hover">
          Back to Show
        </Link>
      </div>
    )
  }

  const stage = episode.pipeline_stages as { id: string; name: string; position: number } | null
  const showData = (episode as any).shows as { name?: string; clients?: any } | null
  const client = showData?.clients ?? null

  const providerMeta: Record<string, { displayName: string; acceptedMimeTypes?: string[] }> = {
    frame_io: { displayName: 'Frame.io' },
    google_drive: { displayName: 'Google Drive' },
    vimeo: { displayName: 'Vimeo', acceptedMimeTypes: ['video/*'] },
    youtube: { displayName: 'YouTube', acceptedMimeTypes: ['video/*'] },
    dropbox: { displayName: 'Dropbox' },
  }

  const hasAudioFiles = !!episodeIntegration || (audioFileRefs || []).some(
    (f: { mime_type: string | null }) => f.mime_type?.startsWith('audio/') || f.mime_type?.startsWith('video/')
  )

  const integration = episodeIntegration ? {
    provider: episodeIntegration.provider as IntegrationProvider,
    externalProjectId: episodeIntegration.external_project_id,
    externalFolderId: episodeIntegration.external_folder_id,
    externalViewUrl: episodeIntegration.external_view_url,
    displayName: providerMeta[episodeIntegration.provider]?.displayName || episodeIntegration.provider,
    acceptedMimeTypes: providerMeta[episodeIntegration.provider]?.acceptedMimeTypes,
  } : null

  const formatDate = (d: string | null) => {
    if (!d) return null
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Episode header */}
      <div className="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
        {/* Top row: back nav + actions */}
        <div className="flex items-center justify-between">
          <Link
            href={`/app/shows/${showId}`}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {showData?.name || 'Show'}
          </Link>
          <div className="flex items-center gap-2">
            {(distributionConnections || []).map((dc: any) => (
              <PublishButton
                key={dc.id}
                showId={showId}
                episodeId={episodeId}
                provider={dc.provider}
                episode={{
                  title: episode.title,
                  episode_number: episode.episode_number,
                  description: episode.description,
                  scheduled_publish_date: episode.scheduled_publish_date,
                }}
                deliverables={(deliverables || []).map((d: any) => ({ id: d.id, title: d.title, type: d.type }))}
              />
            ))}
            <Link
              href={`/app/shows/${showId}/episodes/${episodeId}/edit`}
              className="rounded-md border border-border-subtle bg-surface-default px-3 py-1.5 text-sm font-medium text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors"
            >
              Edit
            </Link>
            <EpisodeDetailActions showId={showId} episodeId={episodeId} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-text-primary">
          {episode.episode_number != null && (
            <span className="text-text-secondary font-semibold">EP {episode.episode_number} · </span>
          )}
          {episode.title}
        </h1>

        {/* Published info */}
        {episode.published_at && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center rounded-full bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 text-xs font-medium">
              Published {formatDate(episode.published_at)}
            </span>
            {(episode.distribution_metadata as any)?.share_url && (
              <a href={(episode.distribution_metadata as any).share_url} target="_blank" rel="noopener noreferrer" className="rounded border border-border-subtle bg-surface-default px-2 py-0.5 text-xs text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors">
                Transistor
              </a>
            )}
            {(episode.distribution_metadata as any)?.view_url && (
              <a href={(episode.distribution_metadata as any).view_url} target="_blank" rel="noopener noreferrer" className="rounded border border-border-subtle bg-surface-default px-2 py-0.5 text-xs text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors">
                YouTube
              </a>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
        {/* Left column: files */}
        <div>
          <EpisodeDetailContent
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
            hasIntegration={!!episodeIntegration}
          />
        </div>

        {/* Right column: AI assistant */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <AiPanel
            episodeId={episodeId}
            showId={showId}
            hasAudioFiles={hasAudioFiles}
          />
        </aside>
      </div>
    </div>
  )
}

