import { createClient } from '@/lib/supabase/server'
import { QuickCreate } from '@/components/dashboard/quick-create'
import { KanbanBoard } from '@/components/dashboard/kanban-board'

const stages = ['planning', 'recording', 'editing', 'review', 'approved'] as const

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <p className="text-text-tertiary">Loading...</p>
  }

  const { data: episodesData } = await supabase
    .from('episodes')
    .select('id, title, episode_number, status, scheduled_publish_date, updated_at, image_url, show_id, shows(id, name)')
    .in('status', stages as unknown as string[])
    .order('updated_at', { ascending: true })

  const allEpisodes = episodesData || []

  const columns: Record<string, { id: string; title: string; episode_number: number | null; status: string; scheduled_publish_date: string | null; updated_at: string; image_url: string | null; show_id: string; shows: { id: string; name: string } | null }[]> = {}
  for (const s of stages) columns[s] = []
  for (const ep of allEpisodes) {
    const showRaw = ep.shows as unknown
    const show = (Array.isArray(showRaw) ? showRaw[0] : showRaw) as { id: string; name: string } | null
    if (columns[ep.status]) {
      columns[ep.status].push({
        id: ep.id,
        title: ep.title,
        episode_number: ep.episode_number,
        status: ep.status,
        scheduled_publish_date: ep.scheduled_publish_date,
        updated_at: ep.updated_at,
        image_url: ep.image_url ?? null,
        show_id: ep.show_id,
        shows: show,
      })
    }
  }

  const hasAnyEpisodes = allEpisodes.length > 0

  return (
    <div>
      <div className="flex items-center justify-between">
        <div />
        <QuickCreate />
      </div>

      {!hasAnyEpisodes ? (
        <p className="text-sm text-text-tertiary py-12 text-center">No episodes yet. Create a show and add your first episode to get started.</p>
      ) : (
        <div className="mt-4">
          <KanbanBoard columns={columns} />
        </div>
      )}
    </div>
  )
}
