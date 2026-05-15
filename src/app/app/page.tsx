import { createClient } from '@/lib/supabase/server'
import { resolveImageUrl } from '@/lib/r2/client'
import { autoArchiveApprovedEpisodes } from '@/lib/episodes/auto-archive'
import { getActiveOrgId } from '@/lib/org/server'
import { DashboardTabs } from '@/components/dashboard/dashboard-tabs'
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <p className="text-text-tertiary">Loading...</p>
  }

  const orgId = await getActiveOrgId(user.id)

  autoArchiveApprovedEpisodes(supabase)

  const [{ data: stagesData }, { data: episodesData }] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('id, name, position, wip_limit, show_id, shows!inner(clients!inner(org_id))')
      .eq('shows.clients.org_id', orgId!)
      .order('position', { ascending: true }),
    supabase
      .from('episodes')
      .select('id, title, episode_number, status, stage_id, position, scheduled_publish_date, updated_at, image_url, show_id, client_submitted, shows!inner(id, name, clients!inner(id, name, company, org_id)), episode_tags(tag_id, tags(id, name, color))')
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
      client_submitted: ep.client_submitted ?? false,
    }
  })

  return (
    <div className="space-y-4">
      <OnboardingChecklist />

      <DashboardTabs columns={columns} episodes={episodes} />
    </div>
  )
}
