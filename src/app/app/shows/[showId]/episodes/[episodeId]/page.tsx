import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EpisodeDetailActions } from './episode-detail-actions'
import { PublishButton } from './publish-button'
import { EpisodeTabs } from './episode-tabs'
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
    <div className="max-w-[1640px] mx-auto">
      {/* Page header */}
      <div>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] font-[family-name:var(--font-display)] text-text-primary">
              {episode.title}
            </h1>
            <p className="text-[13.5px] text-text-secondary mt-1">
              {showData?.name}{client?.name ? ` · with ${client.name}` : ''}
              {episode.scheduled_publish_date && <> — scheduled to publish <span className="font-mono">{formatDate(episode.scheduled_publish_date)}</span></>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
            <EpisodeDetailActions showId={showId} episodeId={episodeId} />
          </div>
        </div>

        {/* Published info */}
        {episode.published_at && (
          <div className="flex flex-wrap items-center gap-2 mt-3 text-sm">
            <span className="inline-flex items-center rounded-full bg-success/20 text-success px-2.5 py-0.5 text-xs font-medium">
              Published {formatDate(episode.published_at)}
            </span>
            {(episode.distribution_metadata as any)?.share_url && (
              <a href={(episode.distribution_metadata as any).share_url} target="_blank" rel="noopener noreferrer" className="rounded-[5px] border border-border-subtle px-2 py-0.5 text-xs text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors">
                Transistor
              </a>
            )}
          </div>
        )}
      </div>

      <EpisodeTabs
        episodeId={episodeId}
        showId={showId}
        showName={showData?.name || 'Show'}
        clientName={client?.name || null}
        stage={stage ? { id: stage.id, name: stage.name } : null}
        episode={{
          episode_number: episode.episode_number,
          scheduled_publish_date: episode.scheduled_publish_date,
          published_at: episode.published_at,
          description: episode.description,
          notes: episode.notes,
        }}
        integration={integration}
        deliverables={deliverables || []}
        connectedProviders={(connectedProviders || []).map(p => p.provider as IntegrationProvider)}
        hasIntegration={!!episodeIntegration}
        hasAudioFiles={hasAudioFiles}
        fileCount={(audioFileRefs || []).length}
        distributionConnections={(distributionConnections || []).map((dc: any) => ({ id: dc.id, provider: dc.provider }))}
      />
    </div>
  )
}
