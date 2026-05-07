import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { resolveImageUrl } from '@/lib/r2/client'
import { ShowHero } from '@/components/portal/show-hero'
import { ReviewQueue } from '@/components/portal/review-queue'
import { EpisodeTimeline } from '@/components/portal/episode-timeline'
import { ActivityFeed } from '@/components/portal/activity-feed'

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
    .select('id, name, description, cover_art_url')
    .eq('id', showId)
    .single()

  if (!show) redirect('/portal')

  const [
    { data: stages },
    { data: episodes },
    { data: reviewDeliverables },
    { data: allPendingRows },
    { data: activities },
    { data: allFileRefs },
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
      .select('id, type, title, description, file_url, status, reviewer_notes, reviewed_at, created_at, episode_id, episodes(title, episode_number)')
      .eq('show_id', showId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('deliverables')
      .select('episode_id')
      .eq('show_id', showId)
      .eq('status', 'pending'),
    supabase
      .from('activity_log')
      .select('*')
      .eq('show_id', showId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('file_references')
      .select('id, deliverable_id, mime_type, provider')
      .eq('provider', 'frame_io')
      .not('deliverable_id', 'is', null),
  ])

  // Build map of deliverable_id → mime_type for video/audio file refs
  const deliverableIds = new Set((reviewDeliverables ?? []).map((d) => d.id))
  const fileRefMap = new Map<string, string>()
  for (const fr of allFileRefs ?? []) {
    if (fr.deliverable_id && deliverableIds.has(fr.deliverable_id) && fr.mime_type && (fr.mime_type.startsWith('video/') || fr.mime_type.startsWith('audio/'))) {
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
      file_url: d.file_url,
      status: d.status,
      reviewer_notes: d.reviewer_notes,
      reviewed_at: d.reviewed_at,
      created_at: d.created_at,
      episode_title: ep?.title ?? null,
      episode_number: ep?.episode_number ?? null,
      reviewUrl: hasReviewableFile ? `/portal/shows/${showId}/episodes/${d.episode_id}/review/${d.id}` : undefined,
    }
  })

  // Build per-episode pending counts
  const pendingByEpisode = new Map<string, number>()
  for (const row of allPendingRows ?? []) {
    if (row.episode_id) {
      pendingByEpisode.set(row.episode_id, (pendingByEpisode.get(row.episode_id) ?? 0) + 1)
    }
  }

  const episodesWithPending = (episodes ?? []).map((ep) => ({
    ...ep,
    pendingCount: pendingByEpisode.get(ep.id) ?? 0,
  }))

  return (
    <div className="space-y-10">
      <ShowHero
        show={{
          id: show.id,
          name: show.name,
          description: show.description,
          coverArtUrl: resolveImageUrl(show.cover_art_url),
        }}
      />

      <section>
        <h2 className="text-sm font-medium text-text-secondary mb-3">
          Needs Your Review
          {reviewItems.length > 0 && (
            <span className="ml-2 text-accent font-medium">({reviewItems.length})</span>
          )}
        </h2>
        <ReviewQueue deliverables={reviewItems} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-text-secondary">Episodes</h2>
          <Link
            href={`/portal/shows/${showId}/assets`}
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Brand assets
          </Link>
        </div>
        <EpisodeTimeline
          episodes={episodesWithPending}
          stages={stages ?? []}
          showId={showId}
        />
      </section>

      {activities && activities.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-text-secondary mb-3">Recent Activity</h2>
          <div className="rounded-lg bg-surface-raised border border-border-subtle p-4">
            <ActivityFeed activities={activities} />
          </div>
        </section>
      )}
    </div>
  )
}
