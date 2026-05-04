import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET() {
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const today = new Date()
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const todayStr = today.toISOString().split('T')[0]
  const nextWeekStr = nextWeek.toISOString().split('T')[0]
  const monthStartStr = monthStart.toISOString()

  const [
    inProgressResult,
    deadlinesResult,
    recentActivityResult,
    clientCountResult,
    showCountResult,
    episodesThisMonthResult,
  ] = await Promise.all([
    // Episodes in progress (not published)
    supabase!
      .from('episodes')
      .select('*, shows(id, name)')
      .neq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(10),

    // Upcoming deadlines (within next 7 days)
    supabase!
      .from('episodes')
      .select('*, shows(id, name)')
      .gte('scheduled_publish_date', todayStr)
      .lte('scheduled_publish_date', nextWeekStr)
      .order('scheduled_publish_date', { ascending: true }),

    // Recent activity (last 10 updated)
    supabase!
      .from('episodes')
      .select('*, shows(id, name)')
      .order('updated_at', { ascending: false })
      .limit(10),

    // Client count
    supabase!
      .from('clients')
      .select('*', { count: 'exact', head: true }),

    // Show count
    supabase!
      .from('shows')
      .select('*', { count: 'exact', head: true }),

    // Episodes created this month
    supabase!
      .from('episodes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStartStr),
  ])

  // Check for any query errors
  const queryError =
    inProgressResult.error ||
    deadlinesResult.error ||
    recentActivityResult.error ||
    clientCountResult.error ||
    showCountResult.error ||
    episodesThisMonthResult.error

  if (queryError) return errorResponse(queryError.message, 500)

  return jsonResponse({
    episodes_in_progress: inProgressResult.data,
    upcoming_deadlines: deadlinesResult.data,
    recent_activity: recentActivityResult.data,
    stats: {
      client_count: clientCountResult.count ?? 0,
      show_count: showCountResult.count ?? 0,
      episodes_this_month: episodesThisMonthResult.count ?? 0,
    },
  })
}
