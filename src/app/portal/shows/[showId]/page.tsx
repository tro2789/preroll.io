import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveImageUrl } from '@/lib/r2/client'
import { ShowHero } from '@/components/portal/show-hero'
import { ShowTabs } from '@/components/portal/show-tabs'

export default async function PortalShowPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: show } = await supabase
    .from('shows')
    .select('id, name, description, cover_art_url, allow_client_downloads, clients!inner(org_id, organizations(allow_client_downloads))')
    .eq('id', showId)
    .single()

  if (!show) redirect('/portal')

  const clientRow = show.clients as unknown as { organizations: { allow_client_downloads: boolean } | null } | null
  const orgDownloads = clientRow?.organizations?.allow_client_downloads ?? true
  const allowDownloads = show.allow_client_downloads !== null ? show.allow_client_downloads : orgDownloads

  const [
    { data: stages },
    { data: episodes },
    { data: reviewDeliverables },
    { data: activities },
    { data: allFileRefs },
    { data: assets },
  ] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('id, name, position')
      .eq('show_id', showId)
      .order('position', { ascending: true }),
    supabase
      .from('episodes')
      .select('id, title, episode_number, status, stage_id, scheduled_publish_date')
      .eq('show_id', showId)
      .is('archived_at', null)
      .order('episode_number', { ascending: true, nullsFirst: false }),
    supabase
      .from('deliverables')
      .select('id, type, title, description, producer_notes, file_url, status, reviewer_notes, reviewed_at, created_at, episode_id, episodes(title, episode_number)')
      .eq('show_id', showId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('activity_log')
      .select('*')
      .eq('show_id', showId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('file_references')
      .select('id, deliverable_id, mime_type, thumbnail_url, provider')
      .not('deliverable_id', 'is', null),
    supabase
      .from('assets')
      .select('id, name, asset_type, mime_type, file_key')
      .eq('show_id', showId)
      .is('episode_id', null)
      .order('created_at', { ascending: false }),
  ])

  const deliverableIds = new Set((reviewDeliverables ?? []).map((d) => d.id))
  const fileRefMap = new Map<string, string>()
  const thumbMap = new Map<string, string>()
  for (const fr of allFileRefs ?? []) {
    if (!fr.deliverable_id || !deliverableIds.has(fr.deliverable_id)) continue
    if (fr.thumbnail_url) thumbMap.set(fr.deliverable_id, fr.thumbnail_url)
    if (fr.mime_type && (fr.mime_type.startsWith('video/') || fr.mime_type.startsWith('audio/'))) {
      fileRefMap.set(fr.deliverable_id, fr.mime_type)
    }
  }

  // Transform deliverables for ReviewQueue
  const reviewItems = (reviewDeliverables ?? []).map((d) => {
    const epRaw = d.episodes as unknown
    const ep = (Array.isArray(epRaw) ? epRaw[0] : epRaw) as { title: string; episode_number: number | null } | null
    const hasReviewableFile = fileRefMap.has(d.id)
    return {
      id: d.id,
      type: d.type,
      title: d.title,
      description: d.description,
      producer_notes: d.producer_notes,
      file_url: d.file_url,
      status: d.status,
      reviewer_notes: d.reviewer_notes,
      reviewed_at: d.reviewed_at,
      created_at: d.created_at,
      episode_title: ep?.title ?? null,
      episode_number: ep?.episode_number ?? null,
      reviewUrl: hasReviewableFile ? `/portal/shows/${showId}/episodes/${d.episode_id}/review/${d.id}` : undefined,
      thumbnailUrl: thumbMap.get(d.id),
    }
  })

  const pendingByEpisode = new Map<string, number>()
  for (const d of reviewDeliverables ?? []) {
    if (d.episode_id) {
      pendingByEpisode.set(d.episode_id, (pendingByEpisode.get(d.episode_id) ?? 0) + 1)
    }
  }

  const episodesWithPending = (episodes ?? []).map((ep) => ({
    ...ep,
    pendingCount: pendingByEpisode.get(ep.id) ?? 0,
  }))

  return (
    <div className="space-y-6">
      <ShowHero
        show={{
          id: show.id,
          name: show.name,
          description: show.description,
          coverArtUrl: resolveImageUrl(show.cover_art_url),
        }}
      />

      <ShowTabs
        showId={showId}
        reviewItems={reviewItems}
        allowDownload={allowDownloads}
        episodes={episodesWithPending}
        stages={stages ?? []}
        activities={activities ?? []}
        assets={(assets ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          assetType: a.asset_type,
          mimeType: a.mime_type,
        }))}
      />
    </div>
  )
}
