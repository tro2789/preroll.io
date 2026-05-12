import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { resolveImageUrl } from '@/lib/r2/client'
import { autoArchiveApprovedEpisodes } from '@/lib/episodes/auto-archive'
import { PipelineBoard } from '@/components/episodes/pipeline-board'
import { StageManagerTrigger } from '@/components/episodes/stage-manager-trigger'
import { QuickCreateEpisode } from '@/components/episodes/quick-create-episode'
import { BatchAiButton } from '@/components/shows/batch-ai-button'
import { Thumbnail } from '@/components/ui/thumbnail'
import { ClientPortalSection, type PortalClient } from '@/components/client-portal-section'

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()

  await autoArchiveApprovedEpisodes(supabase)

  const [{ data: show, error }, { data: episodes }] = await Promise.all([
    supabase
      .from('shows')
      .select('*, clients(id, name, email, invite_code, client_user_id, onboarded_at), pipeline_stages(*)')
      .eq('id', showId)
      .order('position', { referencedTable: 'pipeline_stages' })
      .single(),
    supabase
      .from('episodes')
      .select('id, title, episode_number, stage_id, status, position, scheduled_publish_date, frame_io_url, image_url, show_id, distribution_status, episode_tags(tag_id, tags(id, name, color))')
      .eq('show_id', showId)
      .is('archived_at', null)
      .order('position', { ascending: true })
      .order('episode_number', { ascending: true }),
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

  const totalEpisodes = episodes?.length ?? 0
  const client = show.clients as PortalClient | null
  const stages = (show.pipeline_stages ?? []) as { id: string; name: string; position: number; wip_limit: number | null; status_override: string | null }[]

  return (
    <div>
      <div>
        {client && (
          <Link
            href={`/app/clients/${client.id}`}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            &larr; {client.name}
          </Link>
        )}
        <div className="mt-2 flex items-start gap-4">
          <Thumbnail id={show.id} imageUrl={resolveImageUrl(show.cover_art_url)} className="w-20 h-20 sm:w-14 sm:h-14 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-text-primary leading-tight">{show.name}</h1>
            {show.description && (
              <p className="mt-1 text-sm text-text-secondary leading-relaxed line-clamp-2">{show.description}</p>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Link
              href={`/app/shows/${showId}/assets`}
              className="rounded-md bg-surface-overlay border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-border-hover"
            >
              Assets
            </Link>
            <Link
              href={`/app/shows/${showId}/edit`}
              className="rounded-md bg-surface-overlay border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-border-hover"
            >
              Edit
            </Link>
          </div>
        </div>
        <div className="mt-3 flex sm:hidden items-center gap-2">
          <Link
            href={`/app/shows/${showId}/assets`}
            className="rounded-md bg-surface-overlay border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-border-hover"
          >
            Assets
          </Link>
          <Link
            href={`/app/shows/${showId}/edit`}
            className="rounded-md bg-surface-overlay border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-border-hover"
          >
            Edit
          </Link>
        </div>
      </div>

      {client && (
        <div className="mt-6 max-w-sm">
          <ClientPortalSection
            clientId={client.id}
            clientName={client.name}
            clientEmail={client.email}
            inviteCode={client.invite_code}
            onboardedAt={client.onboarded_at}
          />
        </div>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-text-secondary">
            Episodes
            <span className="ml-2 text-sm font-normal">({totalEpisodes})</span>
          </h2>
          <div className="flex items-center gap-2">
            <BatchAiButton showId={showId} />
            <StageManagerTrigger showId={showId} stages={stages} />
            <QuickCreateEpisode showId={showId} />
          </div>
        </div>

        {totalEpisodes === 0 ? (
          <p className="text-sm text-text-tertiary">
            No episodes yet. Create one to get started.
          </p>
        ) : (
          <PipelineBoard
            showId={showId}
            stages={stages}
            episodes={(episodes ?? []).map((ep) => {
              const episodeTags = (ep.episode_tags as unknown as { tags: { id: string; name: string; color: string } | null }[] | null) ?? []
              return {
                ...ep,
                frame_io_url: ep.frame_io_url ?? null,
                image_url: resolveImageUrl(ep.image_url),
                tags: episodeTags.map((et) => et.tags).filter(Boolean) as { id: string; name: string; color: string }[],
              }
            })}
          />
        )}
      </section>
    </div>
  )
}
