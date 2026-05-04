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
        <p className="text-zinc-400">Show not found.</p>
        <Link
          href="/app/clients"
          className="mt-4 inline-block text-sm text-indigo-400 hover:text-indigo-300"
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
              className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              &larr; Client: {client.name}
            </Link>
          )}
          <h1 className="mt-2 text-2xl font-bold text-white">{show.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {show.format && (
              <span className="inline-flex items-center rounded-full bg-indigo-900/50 px-2.5 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-700/50">
                {show.format}
              </span>
            )}
            {show.schedule && (
              <span className="text-sm text-zinc-400">{show.schedule}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/app/shows/${showId}/assets`}
            className="inline-flex items-center rounded-md bg-zinc-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-600"
          >
            Assets
          </Link>
          <Link
            href={`/app/shows/${showId}/edit`}
            className="inline-flex items-center rounded-md bg-zinc-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-600"
          >
            Edit
          </Link>
        </div>
      </div>

      {show.description && (
        <p className="mt-4 text-sm text-zinc-300 whitespace-pre-wrap">
          {show.description}
        </p>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Episodes
            <span className="ml-2 text-sm font-normal text-zinc-500">({totalEpisodes})</span>
          </h2>
          <Link
            href={`/app/shows/${showId}/episodes/new`}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Add Episode
          </Link>
        </div>

        {totalEpisodes === 0 ? (
          <p className="text-sm text-zinc-500">
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
