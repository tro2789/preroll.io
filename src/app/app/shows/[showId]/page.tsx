import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { resolveImageUrl } from '@/lib/r2/client'
import { autoArchiveApprovedEpisodes } from '@/lib/episodes/auto-archive'
import { ChatContextSync } from '@/components/chat/chat-context-sync'
import { ShowTabs } from '@/components/shows/show-tabs'
import type { PortalClient } from '@/components/client-portal-section'

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()

  autoArchiveApprovedEpisodes(supabase)

  const [{ data: show, error }, { data: episodes }, { data: publishedEpisodes }] = await Promise.all([
    supabase
      .from('shows')
      .select('id, name, description, cover_art_url, format, schedule, allow_client_downloads, client_id, ai_auto_transcribe, ai_auto_generate, ai_tone, ai_length, episode_template, clients(id, name, email, invite_code, client_user_id, onboarded_at), pipeline_stages(id, name, position, wip_limit, status_override)')
      .eq('id', showId)
      .order('position', { referencedTable: 'pipeline_stages' })
      .single(),
    supabase
      .from('episodes')
      .select('id, title, episode_number, stage_id, status, position, scheduled_publish_date, frame_io_url, image_url, show_id, distribution_status, episode_tags(tag_id, tags(id, name, color))')
      .eq('show_id', showId)
      .not('status', 'eq', 'published')
      .is('archived_at', null)
      .order('position', { ascending: true })
      .order('episode_number', { ascending: true }),
    supabase
      .from('episodes')
      .select('id, title, episode_number, status, scheduled_publish_date, published_at, image_url, show_id')
      .eq('show_id', showId)
      .eq('status', 'published')
      .is('archived_at', null)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('episode_number', { ascending: false }),
  ])

  if (error || !show) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Show not found.</p>
        <Link
          href="/app/clients"
          className="mt-4 inline-block text-sm text-accent hover:text-accent-hover"
        >
          Back to Clients
        </Link>
      </div>
    )
  }

  const clientsRaw = show.clients as unknown
  const client = (Array.isArray(clientsRaw) ? clientsRaw[0] : clientsRaw) as PortalClient | null
  const stages = (show.pipeline_stages ?? []) as { id: string; name: string; position: number; wip_limit: number | null; status_override: string | null }[]

  const showData = {
    id: show.id,
    name: show.name as string,
    description: show.description as string | null,
    cover_art_url: show.cover_art_url as string | null,
    format: show.format as string | null,
    schedule: show.schedule as string | null,
    allow_client_downloads: show.allow_client_downloads as boolean | null,
    ai_auto_transcribe: (show.ai_auto_transcribe as boolean) ?? true,
    ai_auto_generate: show.ai_auto_generate as string[] | null,
    ai_tone: show.ai_tone as string | null,
    ai_length: show.ai_length as string | null,
    episode_template: show.episode_template as { description?: string; notes?: string } | null,
    client_id: show.client_id as string | null,
  }

  const mappedEpisodes = (episodes ?? []).map((ep) => {
    const episodeTags = (ep.episode_tags as unknown as { tags: { id: string; name: string; color: string } | null }[] | null) ?? []
    return {
      ...ep,
      frame_io_url: ep.frame_io_url ?? null,
      image_url: resolveImageUrl(ep.image_url),
      tags: episodeTags.map((et) => et.tags).filter(Boolean) as { id: string; name: string; color: string }[],
    }
  })

  const mappedPublished = (publishedEpisodes ?? []).map((ep) => ({
    ...ep,
    image_url: resolveImageUrl(ep.image_url),
  }))

  const resolvedCoverArtUrl = resolveImageUrl(show.cover_art_url)

  return (
    <div>
      <ChatContextSync contextLabel={`${show.name}${client ? ` (${client.name})` : ''}`} />
      <ShowTabs
        show={showData}
        client={client}
        stages={stages}
        episodes={mappedEpisodes}
        publishedEpisodes={mappedPublished}
        resolvedCoverArtUrl={resolvedCoverArtUrl}
      />
    </div>
  )
}
