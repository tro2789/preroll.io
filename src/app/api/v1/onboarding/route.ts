import { getAuthenticatedClient, jsonResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const service = createServiceClient()

  const [orgRes, countsRes, firstClientRes, firstShowRes, sampleRes] = await Promise.all([
    service.from('organizations').select('onboarding_dismissed_at')
      .eq('id', org!.id).single(),
    service.rpc('onboarding_counts', { p_org_id: org!.id }).single(),
    service.from('clients').select('id')
      .eq('org_id', org!.id).eq('is_sample', false).order('created_at').limit(1).maybeSingle(),
    service.from('shows').select('id, clients!inner(id)')
      .eq('clients.org_id', org!.id).eq('clients.is_sample', false).limit(1).maybeSingle(),
    service.from('clients').select('id', { count: 'exact', head: true })
      .eq('org_id', org!.id).eq('is_sample', true),
  ])

  if (orgRes.data?.onboarding_dismissed_at) {
    return jsonResponse({ dismissed: true })
  }

  const counts = countsRes.data as { real_shows: number; real_episodes: number; moved_episodes: number } | null

  return jsonResponse({
    dismissed: false,
    steps: {
      client_created: !!firstClientRes.data,
      show_created: (counts?.real_shows ?? 0) > 0,
      episode_created: (counts?.real_episodes ?? 0) > 0,
      episode_moved: (counts?.moved_episodes ?? 0) > 0,
    },
    sample_client_exists: (sampleRes.count ?? 0) > 0,
    links: {
      create_client: '/app/clients',
      add_show: firstClientRes.data ? `/app/clients/${firstClientRes.data.id}` : '/app/clients',
      create_episode: firstShowRes.data ? `/app/shows/${firstShowRes.data.id}/episodes/new` : '/app/shows',
      move_episode: '/app',
    },
  })
}
