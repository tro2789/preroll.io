import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET(request: NextRequest) {
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const showId = request.nextUrl.searchParams.get('show_id')
  if (!showId) return errorResponse('show_id is required')

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)

  const { data, error: dbError } = await supabase!
    .from('activity_log')
    .select('*')
    .eq('show_id', showId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}
