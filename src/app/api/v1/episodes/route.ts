import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET(request: NextRequest) {
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const status = request.nextUrl.searchParams.get('status')
  const showId = request.nextUrl.searchParams.get('show_id')
  const stageId = request.nextUrl.searchParams.get('stage_id')
  const upcoming = request.nextUrl.searchParams.get('upcoming')
  const from = request.nextUrl.searchParams.get('from')
  const to = request.nextUrl.searchParams.get('to')

  const limitParam = parseInt(request.nextUrl.searchParams.get('limit') || '', 10)
  const offsetParam = parseInt(request.nextUrl.searchParams.get('offset') || '', 10)
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 100
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0

  let query = supabase!
    .from('episodes')
    .select('id, title, episode_number, status, show_id, stage_id, scheduled_publish_date, created_at, shows!inner(id, name, clients!inner(org_id))')
    .eq('shows.clients.org_id', org!.id)
    .order('scheduled_publish_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }
  if (showId) {
    query = query.eq('show_id', showId)
  }
  if (stageId) {
    query = query.eq('stage_id', stageId)
  }
  if (from) {
    query = query.gte('scheduled_publish_date', from)
  }
  if (to) {
    query = query.lte('scheduled_publish_date', to)
  }
  if (upcoming === 'true') {
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    query = query.gte('scheduled_publish_date', today).lte('scheduled_publish_date', nextWeek)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error: dbError } = await query

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}
