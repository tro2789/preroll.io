import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getShowForOrg } from '@/lib/api/ownership'

export async function GET(request: NextRequest) {
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const showId = request.nextUrl.searchParams.get('show_id')
  if (!showId) return errorResponse('show_id is required')

  if (!(await getShowForOrg(supabase!, showId, org!.id))) return errorResponse('Show not found', 404)

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)

  const { data, error: dbError } = await supabase!
    .from('activity_log')
    .select('*, shows!inner(clients!inner(org_id))')
    .eq('show_id', showId)
    .eq('shows.clients.org_id', org!.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}
