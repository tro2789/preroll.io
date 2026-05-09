import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET() {
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const today = new Date()
  const nextTwoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const todayStr = today.toISOString().split('T')[0]
  const nextTwoWeeksStr = nextTwoWeeks.toISOString().split('T')[0]
  const monthStartStr = monthStart.toISOString()

  const [
    inProgressResult,
    deadlinesResult,
    activityResult,
    clientCountResult,
    showCountResult,
    episodesThisMonthResult,
    pendingDeliverablesResult,
  ] = await Promise.all([
    supabase!
      .from('episodes')
      .select('id, title, episode_number, status, scheduled_publish_date, updated_at, stage_id, pipeline_stages(name), shows!inner(id, name, clients!inner(org_id))')
      .eq('shows.clients.org_id', org!.id)
      .neq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(12),

    supabase!
      .from('episodes')
      .select('id, title, episode_number, status, scheduled_publish_date, shows!inner(id, name, clients!inner(org_id)), pipeline_stages(name)')
      .eq('shows.clients.org_id', org!.id)
      .gte('scheduled_publish_date', todayStr)
      .lte('scheduled_publish_date', nextTwoWeeksStr)
      .neq('status', 'published')
      .order('scheduled_publish_date', { ascending: true })
      .limit(8),

    supabase!
      .from('activity_log')
      .select('id, action, description, created_at, show_id, shows!inner(name, clients!inner(org_id))')
      .eq('shows.clients.org_id', org!.id)
      .order('created_at', { ascending: false })
      .limit(8),

    supabase!
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org!.id),

    supabase!
      .from('shows')
      .select('*, clients!inner(org_id)', { count: 'exact', head: true })
      .eq('clients.org_id', org!.id),

    supabase!
      .from('episodes')
      .select('*, shows!inner(clients!inner(org_id))', { count: 'exact', head: true })
      .eq('shows.clients.org_id', org!.id)
      .gte('created_at', monthStartStr),

    supabase!
      .from('deliverables')
      .select('*, shows!inner(clients!inner(org_id))', { count: 'exact', head: true })
      .eq('shows.clients.org_id', org!.id)
      .eq('status', 'pending'),
  ])

  const queryError =
    inProgressResult.error ||
    deadlinesResult.error ||
    activityResult.error ||
    clientCountResult.error ||
    showCountResult.error ||
    episodesThisMonthResult.error ||
    pendingDeliverablesResult.error

  if (queryError) return errorResponse(queryError.message, 500)

  return jsonResponse({
    episodes_in_progress: inProgressResult.data,
    upcoming_deadlines: deadlinesResult.data,
    recent_activity: activityResult.data,
    stats: {
      client_count: clientCountResult.count ?? 0,
      show_count: showCountResult.count ?? 0,
      episodes_this_month: episodesThisMonthResult.count ?? 0,
      pending_deliverables: pendingDeliverablesResult.count ?? 0,
    },
  })
}
