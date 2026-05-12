import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EpisodeDetailActions } from './episode-detail-actions'
import { PublishButton } from './publish-button'
import { EpisodeDetailContent } from './episode-detail-content'
import { AiPanel } from '@/components/episodes/ai-panel'
import { PeekPane } from '@/components/episodes/peek-pane'
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

  const stageColor = stage ? {
    planning: 'var(--color-status-planning)',
    recording: 'var(--color-status-recording)',
    editing: 'var(--color-status-editing)',
    review: 'var(--color-status-review)',
    approved: 'var(--color-status-approved)',
    published: 'var(--color-status-published)',
  }[stage.name.toLowerCase()] || undefined : undefined

  return (
    <div className="max-w-[1640px] mx-auto">
      {/* Page header */}
      <div className="pt-1">
        <Link
          href={`/app/shows/${showId}`}
          className="inline-flex items-center gap-1 text-[12.5px] text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg className="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m15 18-6-6 6-6" /></svg>
          {showData?.name || 'Show'}
        </Link>
        <div className="flex items-start gap-4 mt-2">
          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              {episode.episode_number != null && (
                <span className="font-mono text-xs text-text-tertiary">EP {String(episode.episode_number).padStart(3, '0')}</span>
              )}
              {stage && (
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2 py-0.5 rounded-full border border-border-subtle bg-surface-input text-text-secondary">
                  <span className="w-[7px] h-[7px] rounded-full" style={{ background: stageColor }} />
                  {stage.name}
                </span>
              )}
            </div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] font-[family-name:var(--font-display)] text-text-primary mt-1.5">
              {episode.title}
            </h1>
            <p className="text-[13.5px] text-text-secondary mt-1">
              {showData?.name}{client?.name ? ` · with ${client.name}` : ''}
              {episode.scheduled_publish_date && <> — scheduled to publish <span className="font-mono">{formatDate(episode.scheduled_publish_date)}</span></>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/app/shows/${showId}/episodes/${episodeId}/edit`}
              className="inline-flex items-center gap-1.5 px-2.5 py-[5.5px] rounded-[7px] text-[13px] font-medium bg-surface-raised border border-border-default text-text-primary hover:bg-surface-overlay hover:border-border-strong transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              Edit
            </Link>
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

        <div className="flex gap-0.5 border-b border-border-subtle mt-5">
          <span className="px-2.5 py-2 text-[13px] font-medium text-text-primary border-b-2 border-accent -mb-px">Overview</span>
          <span className="px-2.5 py-2 text-[13px] font-[450] text-text-secondary border-b-2 border-transparent -mb-px">Files <span className="font-mono text-[11px] text-fg-faint ml-1.5">{(deliverables || []).length}</span></span>
          <span className="px-2.5 py-2 text-[13px] font-[450] text-text-secondary border-b-2 border-transparent -mb-px">Distribution</span>
          <span className="px-2.5 py-2 text-[13px] font-[450] text-text-secondary border-b-2 border-transparent -mb-px">Activity</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_312px] gap-6 items-start">
        {/* Working area: AI + files */}
        <div className="flex flex-col lg:flex-row gap-5 items-start min-w-0">
          <div className="flex-[1.4] min-w-0">
            <AiPanel
              episodeId={episodeId}
              showId={showId}
              hasAudioFiles={hasAudioFiles}
            />
          </div>
          <div className="flex-1 min-w-0">
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
        </div>

        {/* Peek pane: sticky metadata rail */}
        <aside className="xl:sticky xl:top-16">
          <PeekPane
            episode={{
              episode_number: episode.episode_number,
              scheduled_publish_date: episode.scheduled_publish_date,
              published_at: episode.published_at,
              description: episode.description,
              notes: episode.notes,
            }}
            stage={stage ? { name: stage.name } : null}
            showName={showData?.name || 'Show'}
            clientName={client?.name || null}
            showId={showId}
            deliverables={(deliverables || []).map((d: any) => ({ id: d.id, title: d.title, status: d.status }))}
          />
        </aside>
      </div>
    </div>
  )
}

