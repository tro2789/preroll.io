import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PipelineBoard } from '@/components/episodes/pipeline-board'

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()

  const { data: show, error } = await supabase
    .from('shows')
    .select('*, clients(id, name), pipeline_stages(*)')
    .eq('id', showId)
    .order('position', { referencedTable: 'pipeline_stages' })
    .single()

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

  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, title, episode_number, stage_id, status, scheduled_publish_date, frame_io_url')
    .eq('show_id', showId)
    .order('episode_number', { ascending: true })

  const totalEpisodes = episodes?.length ?? 0
  const client = show.clients as { id: string; name: string } | null
  const stages = (show.pipeline_stages ?? []) as { id: string; name: string; position: number }[]

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          {client && (
            <Link
              href={`/app/clients/${client.id}`}
              className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
            >
              &larr; Client: {client.name}
            </Link>
          )}
          <h1 className="mt-2 text-2xl font-bold text-text-primary">{show.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {show.format && (
              <span className="inline-flex items-center rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium text-accent">
                {show.format}
              </span>
            )}
            {show.schedule && (
              <span className="text-sm text-text-secondary">{show.schedule}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/app/shows/${showId}/assets`}
            className="inline-flex items-center rounded-md bg-surface-overlay border border-border-default px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-hover"
          >
            Assets
          </Link>
          <Link
            href={`/app/shows/${showId}/edit`}
            className="inline-flex items-center rounded-md bg-surface-overlay border border-border-default px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-hover"
          >
            Edit
          </Link>
        </div>
      </div>

      {show.description && (
        <p className="mt-4 text-sm text-text-secondary whitespace-pre-wrap">
          {show.description}
        </p>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-text-tertiary">
            Episodes
            <span className="ml-2 text-sm font-normal">({totalEpisodes})</span>
          </h2>
          <Link
            href={`/app/shows/${showId}/episodes/new`}
            className="inline-flex items-center rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Add Episode
          </Link>
        </div>

        {totalEpisodes === 0 ? (
          <p className="text-sm text-text-tertiary">
            No episodes yet. Create one to get started.
          </p>
        ) : (
          <PipelineBoard
            showId={showId}
            stages={stages}
            episodes={(episodes ?? []).map((ep) => ({
              ...ep,
              frame_io_url: ep.frame_io_url ?? null,
            }))}
          />
        )}
      </section>
    </div>
  )
}
