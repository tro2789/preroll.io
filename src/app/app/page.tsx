import { createClient } from '@/lib/supabase/server'
import { resolveImageUrl } from '@/lib/r2/client'
import { autoArchiveApprovedEpisodes } from '@/lib/episodes/auto-archive'
import { getActiveOrgId } from '@/lib/org/server'
import { QuickCreate } from '@/components/dashboard/quick-create'
import { KanbanBoard } from '@/components/dashboard/kanban-board'
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist'
import { PageHeader } from '@/components/layout/page-header'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <p className="text-text-tertiary">Loading...</p>
  }

  const orgId = await getActiveOrgId(user.id)

  await autoArchiveApprovedEpisodes(supabase)

  const [{ data: stagesData }, { data: episodesData }] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('id, name, position, wip_limit, show_id, shows!inner(clients!inner(org_id))')
      .eq('shows.clients.org_id', orgId!)
      .order('position', { ascending: true }),
    supabase
      .from('episodes')
      .select('id, title, episode_number, status, stage_id, position, scheduled_publish_date, updated_at, image_url, show_id, shows!inner(id, name, clients!inner(id, name, company, org_id)), episode_tags(tag_id, tags(id, name, color))')
      .eq('shows.clients.org_id', orgId!)
      .not('status', 'eq', 'published')
      .is('archived_at', null)
      .order('position', { ascending: true }),
  ])

  const allStages = stagesData || []
  const allEpisodes = episodesData || []

  const positionGroups = new Map<number, { name: string; stageIds: string[]; wipLimit: number | null }>()
  for (const stage of allStages) {
    const existing = positionGroups.get(stage.position)
    if (existing) {
      existing.stageIds.push(stage.id)
    } else {
      positionGroups.set(stage.position, {
        name: stage.name,
        stageIds: [stage.id],
        wipLimit: stage.wip_limit,
      })
    }
  }

  const columns = [...positionGroups.entries()]
    .sort(([a], [b]) => a - b)
    .filter(([pos]) => {
      const group = positionGroups.get(pos)!
      return group.name.toLowerCase() !== 'published'
    })
    .map(([pos, group]) => ({
      position: pos,
      name: group.name,
      stageIds: group.stageIds,
      wipLimit: group.wipLimit,
    }))

  const episodes = allEpisodes.map((ep) => {
    const showRaw = ep.shows as unknown
    const show = (Array.isArray(showRaw) ? showRaw[0] : showRaw) as { id: string; name: string; clients: { id: string; name: string; company: string | null } | null } | null
    const episodeTags = (ep.episode_tags as unknown as { tags: { id: string; name: string; color: string } | null }[] | null) ?? []
    return {
      id: ep.id,
      title: ep.title,
      episode_number: ep.episode_number,
      status: ep.status,
      stage_id: ep.stage_id,
      position: ep.position,
      scheduled_publish_date: ep.scheduled_publish_date,
      updated_at: ep.updated_at,
      image_url: resolveImageUrl(ep.image_url),
      show_id: ep.show_id,
      shows: show ? { id: show.id, name: show.name } : null,
      client: show?.clients ? { id: show.clients.id, name: show.clients.company || show.clients.name } : null,
      tags: episodeTags.map((et) => et.tags).filter(Boolean) as { id: string; name: string; color: string }[],
    }
  })

  const hasAnyEpisodes = episodes.length > 0

  return (
    <div className="space-y-4">
      <OnboardingChecklist />

      <PageHeader
        title="Dashboard"
        description="Every episode in flight across your shows, by pipeline stage. Drag a card to advance it."
        tabs={
          <div className="flex gap-0.5 border-b border-border-subtle">
            <button className="px-2.5 py-2 text-[13px] font-medium text-text-primary border-b-2 border-accent -mb-px">Board</button>
            <button className="px-2.5 py-2 text-[13px] font-[450] text-text-secondary border-b-2 border-transparent -mb-px hover:text-text-primary">Table <span className="font-mono text-[11px] text-fg-faint ml-1.5">{episodes.length}</span></button>
            <button className="px-2.5 py-2 text-[13px] font-[450] text-text-secondary border-b-2 border-transparent -mb-px hover:text-text-primary">Activity</button>
          </div>
        }
        actions={<QuickCreate />}
      />

      {!hasAnyEpisodes ? (
        <p className="text-sm text-text-tertiary py-12 text-center">No episodes yet. Create a show and add your first episode to get started.</p>
      ) : (
        <KanbanBoard columns={columns} episodes={episodes} />
      )}
    </div>
  )
}
