import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EpisodeDetailActions } from './episode-detail-actions'
import { PublishButton } from './publish-button'
import { EpisodeDetailContent } from './episode-detail-content'
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
    <div className="mx-auto max-w-4xl">
      {/* Breadcrumb */}
      <Link
        href={`/app/shows/${showId}`}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {showData?.name || 'Show'}
      </Link>

      {/* Title row */}
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          {episode.episode_number != null && (
            <p className="text-sm font-medium text-text-secondary mb-1">
              Episode {episode.episode_number}
            </p>
          )}
          <h1 className="text-2xl font-bold text-text-primary">{episode.title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
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
            className="rounded-md bg-surface-overlay border border-border-default px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-input"
          >
            Edit
          </Link>
          <EpisodeDetailActions showId={showId} episodeId={episodeId} />
        </div>
      </div>

      {/* Property rows */}
      <div className="mt-5 rounded-lg border border-border-default bg-surface-raised">
        <div className="divide-y divide-border-subtle">
          <PropertyRow label="Stage" value={stage?.name || 'Not set'}>
            {episode.distribution_status === 'published' && (
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-400 px-2 py-0.5 text-xs font-medium">
                Published
              </span>
            )}
            {episode.distribution_status === 'scheduled' && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/15 text-amber-400 px-2 py-0.5 text-xs font-medium">
                Scheduled
              </span>
            )}
          </PropertyRow>

          {episode.scheduled_publish_date && (
            <PropertyRow label="Scheduled" value={formatDate(episode.scheduled_publish_date)!} />
          )}

          {episode.published_at && (
            <PropertyRow label="Published" value={formatDate(episode.published_at)!}>
              {(episode.distribution_metadata as any)?.share_url && (
                <a href={(episode.distribution_metadata as any).share_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-accent hover:text-accent-hover">
                  Transistor
                </a>
              )}
              {(episode.distribution_metadata as any)?.view_url && (
                <a href={(episode.distribution_metadata as any).view_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-accent hover:text-accent-hover">
                  YouTube
                </a>
              )}
            </PropertyRow>
          )}

          {client && (
            <PropertyRow label="Client" value={client.name}>
              <span className={`ml-2 text-xs font-medium ${client.onboarded_at ? 'text-emerald-400' : 'text-amber-400'}`}>
                {client.onboarded_at ? 'Active' : 'Pending'}
              </span>
              <Link
                href={`/portal?preview=${client.id}`}
                target="_blank"
                className="ml-2 text-xs text-accent hover:text-accent-hover"
              >
                Portal
              </Link>
            </PropertyRow>
          )}

          {integration && (
            <PropertyRow label="Provider" value={integration.displayName}>
              {integration.externalViewUrl && (
                <a href={integration.externalViewUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-accent hover:text-accent-hover">
                  Open
                </a>
              )}
            </PropertyRow>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mt-8">
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
          hasAudioFiles={hasAudioFiles}
        />
      </div>
    </div>
  )
}

function PropertyRow({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center px-4 py-2.5">
      <span className="w-28 shrink-0 text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
      {children}
    </div>
  )
}
