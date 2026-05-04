import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

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
    .select('id, title, episode_number, stage_id, scheduled_publish_date')
    .eq('show_id', showId)
    .order('episode_number', { ascending: true })

  // Group episodes by stage
  const episodesByStage: Record<string, typeof episodes> = {}
  const unstaged: typeof episodes = []

  if (episodes) {
    for (const ep of episodes) {
      if (ep.stage_id) {
        if (!episodesByStage[ep.stage_id]) {
          episodesByStage[ep.stage_id] = []
        }
        episodesByStage[ep.stage_id]!.push(ep)
      } else {
        unstaged.push(ep)
      }
    }
  }

  const totalEpisodes = episodes?.length ?? 0
  const client = show.clients as { id: string; name: string } | null

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

      {/* Episode Count Summary */}
      <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
        <p className="text-sm text-zinc-300">
          <span className="font-semibold text-white">{totalEpisodes}</span>{' '}
          {totalEpisodes === 1 ? 'episode' : 'episodes'} total
        </p>
      </div>

      {/* Episodes Grouped by Pipeline Stage */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Episodes</h2>
          <Link
            href={`/app/shows/${showId}/episodes/new`}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Add Episode
          </Link>
        </div>

        {totalEpisodes === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No episodes yet. Create one to get started.
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {show.pipeline_stages?.map(
              (stage: { id: string; name: string; position: number }) => {
                const stageEpisodes = episodesByStage[stage.id]
                if (!stageEpisodes || stageEpisodes.length === 0) return null
                return (
                  <div key={stage.id}>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                      {stage.name}{' '}
                      <span className="text-zinc-500">
                        ({stageEpisodes.length})
                      </span>
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {stageEpisodes.map((ep) => (
                        <li
                          key={ep.id}
                          className="rounded-lg border border-zinc-800 bg-zinc-800/50 px-4 py-3 transition-colors hover:border-zinc-700"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-white">
                                {ep.episode_number != null && (
                                  <span className="text-zinc-500 mr-2">
                                    #{ep.episode_number}
                                  </span>
                                )}
                                {ep.title}
                              </span>
                            </div>
                            {ep.scheduled_publish_date && (
                              <span className="text-xs text-zinc-500">
                                {ep.scheduled_publish_date}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              }
            )}

            {/* Unstaged episodes */}
            {unstaged.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  Unassigned{' '}
                  <span className="text-zinc-500">({unstaged.length})</span>
                </h3>
                <ul className="mt-2 space-y-2">
                  {unstaged.map((ep) => (
                    <li
                      key={ep.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-800/50 px-4 py-3 transition-colors hover:border-zinc-700"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-white">
                            {ep.episode_number != null && (
                              <span className="text-zinc-500 mr-2">
                                #{ep.episode_number}
                              </span>
                            )}
                            {ep.title}
                          </span>
                        </div>
                        {ep.scheduled_publish_date && (
                          <span className="text-xs text-zinc-500">
                            {ep.scheduled_publish_date}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
