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
      .select('id, name, allow_client_downloads, client_id, clients!inner(org_id, organizations(allow_client_downloads))')
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

  const deliverableIds = (deliverables ?? []).map((d: any) => d.id)
  const { data: fileRefs } = deliverableIds.length > 0
    ? await supabase
        .from('file_references')
        .select('id, deliverable_id, mime_type, thumbnail_url, provider, version_group_id')
        .in('deliverable_id', deliverableIds)
    : { data: [] }

  // Count versions per group from the already-fetched file refs
  const versionCountMap = new Map<string, number>()
  for (const fr of fileRefs ?? []) {
    const gid = (fr as any).version_group_id
    if (gid) versionCountMap.set(gid, (versionCountMap.get(gid) || 0) + 1)
  }

  if (!show) redirect('/portal')
  if (!episode) redirect(`/portal/shows/${showId}`)

  const clientRow = show.clients as unknown as { organizations: { allow_client_downloads: boolean } | null } | null
  const orgDownloads = clientRow?.organizations?.allow_client_downloads ?? true
  const allowDownloads = show.allow_client_downloads !== null ? show.allow_client_downloads : orgDownloads

  const reviewUrlMap = new Map<string, string>()
  const thumbnailMap = new Map<string, string>()
  const versionCountForDeliverable = new Map<string, number>()
  for (const fr of fileRefs ?? []) {
    if (!fr.deliverable_id) continue
    if (fr.thumbnail_url) thumbnailMap.set(fr.deliverable_id, fr.thumbnail_url)
    if (fr.mime_type && (fr.mime_type.startsWith('video/') || fr.mime_type.startsWith('audio/'))) {
      reviewUrlMap.set(fr.deliverable_id, `/portal/shows/${showId}/episodes/${episodeId}/review/${fr.deliverable_id}`)
    }
    if ((fr as any).version_group_id) {
      const count = versionCountMap.get((fr as any).version_group_id) || 0
      if (count > 1) versionCountForDeliverable.set(fr.deliverable_id, count)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/portal/shows/${showId}`}
          className="text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          &larr; {show.name}
        </Link>

        <div className="mt-3 flex items-center gap-3">
          {episode.episode_number != null && (
            <span className="text-sm font-mono text-text-secondary">#{episode.episode_number}</span>
          )}
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] font-[family-name:var(--font-display)] text-text-primary">{episode.title}</h1>
        </div>

        <div className="flex items-center gap-3 mt-2">
          {episode.scheduled_publish_date && (
            <span className="text-xs text-text-secondary">
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

      <div className="space-y-6">
        {!deliverables || deliverables.length === 0 ? (
          <div>
            <h2 className="text-[13px] font-semibold text-text-primary mb-3">Shared Files</h2>
            <p className="text-sm text-text-secondary py-4 text-center">
              No shared files yet for this episode.
            </p>
          </div>
        ) : (
          <>
            {deliverables.filter((d) => d.status === 'pending').length > 0 && (
              <div>
                <h2 className="text-[13px] font-semibold text-text-primary mb-3">
                  Needs Review
                  <span className="ml-2 text-text-secondary font-normal">
                    ({deliverables.filter((d) => d.status === 'pending').length})
                  </span>
                </h2>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {deliverables.filter((d) => d.status === 'pending').map((d) => (
                    <DeliverableCard key={d.id} deliverable={d} reviewUrl={reviewUrlMap.get(d.id)} thumbnailUrl={thumbnailMap.get(d.id)} allowDownload={allowDownloads} versionCount={versionCountForDeliverable.get(d.id)} />
                  ))}
                </div>
              </div>
            )}
            {deliverables.filter((d) => d.status !== 'pending').length > 0 && (
              <div>
                <h2 className="text-[13px] font-semibold text-text-primary mb-3">
                  Completed
                  <span className="ml-2 text-text-secondary font-normal">
                    ({deliverables.filter((d) => d.status !== 'pending').length})
                  </span>
                </h2>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {deliverables.filter((d) => d.status !== 'pending').map((d) => (
                    <DeliverableCard key={d.id} deliverable={d} reviewUrl={reviewUrlMap.get(d.id)} thumbnailUrl={thumbnailMap.get(d.id)} allowDownload={allowDownloads} versionCount={versionCountForDeliverable.get(d.id)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {episode.description && (
        <section>
          <h2 className="text-[13px] font-semibold text-text-primary mb-3">Notes</h2>
          <div className="rounded-lg bg-surface-raised border border-border-subtle p-4">
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{episode.description}</p>
          </div>
        </section>
      )}
    </div>
  )
}
