import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET() {
  const { supabase, error } = await getAuthenticatedClient()
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
      .select('id, title, episode_number, status, scheduled_publish_date, updated_at, stage_id, pipeline_stages(name), shows(id, name)')
      .neq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(12),

    supabase!
      .from('episodes')
      .select('id, title, episode_number, status, scheduled_publish_date, shows(id, name), pipeline_stages(name)')
      .gte('scheduled_publish_date', todayStr)
      .lte('scheduled_publish_date', nextTwoWeeksStr)
      .neq('status', 'published')
      .order('scheduled_publish_date', { ascending: true })
      .limit(8),

    supabase!
      .from('activity_log')
      .select('id, action, description, created_at, show_id, shows(name)')
      .order('created_at', { ascending: false })
      .limit(8),

    supabase!
      .from('clients')
      .select('*', { count: 'exact', head: true }),

    supabase!
      .from('shows')
      .select('*', { count: 'exact', head: true }),

    supabase!
      .from('episodes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStartStr),

    supabase!
      .from('deliverables')
      .select('*', { count: 'exact', head: true })
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
