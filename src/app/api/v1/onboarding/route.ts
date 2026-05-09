import { getAuthenticatedClient, jsonResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const service = createServiceClient()

  // Check if dismissed
  const { data: orgData } = await service
    .from('organizations')
    .select('onboarding_dismissed_at')
    .eq('id', org!.id)
    .single()

  if (orgData?.onboarding_dismissed_at) {
    return jsonResponse({ dismissed: true })
  }

  // Run all step detection queries in parallel
  const [clientsRes, showsRes, episodesRes, movedRes, sampleRes, firstClientRes, firstShowRes] = await Promise.all([
    service.from('clients').select('id', { count: 'exact', head: true })
      .eq('org_id', org!.id).eq('is_sample', false),
    service.rpc('count_real_shows', { p_org_id: org!.id }),
    service.rpc('count_real_episodes', { p_org_id: org!.id }),
    service.rpc('count_moved_episodes', { p_org_id: org!.id }),
    service.from('clients').select('id', { count: 'exact', head: true })
      .eq('org_id', org!.id).eq('is_sample', true),
    service.from('clients').select('id')
      .eq('org_id', org!.id).eq('is_sample', false).order('created_at').limit(1).maybeSingle(),
    service.from('shows')
      .select('id, clients!inner(id)')
      .eq('clients.org_id', org!.id).eq('clients.is_sample', false).limit(1).maybeSingle(),
  ])

  const clientCreated = (clientsRes.count ?? 0) > 0
  const showCreated = (showsRes.data ?? 0) > 0
  const episodeCreated = (episodesRes.data ?? 0) > 0
  const episodeMoved = (movedRes.data ?? 0) > 0

  return jsonResponse({
    dismissed: false,
    steps: {
      client_created: clientCreated,
      show_created: showCreated,
      episode_created: episodeCreated,
      episode_moved: episodeMoved,
    },
    sample_client_exists: (sampleRes.count ?? 0) > 0,
    links: {
      create_client: '/app/clients',
      add_show: firstClientRes.data ? `/app/clients/${firstClientRes.data.id}` : '/app/clients',
      create_episode: firstShowRes.data ? `/app/shows/${firstShowRes.data.id}` : '/app/shows',
      move_episode: '/app',
    },
  })
}
