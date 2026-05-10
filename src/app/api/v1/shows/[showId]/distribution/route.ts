import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const provider = request.nextUrl.searchParams.get('provider')

  let query = supabase!
    .from('distribution_connections')
    .select('id, provider, external_show_id, external_show_name, created_at')
    .eq('show_id', showId)

  if (provider) {
    const { data, error: dbError } = await query.eq('provider', provider).maybeSingle()
    if (dbError) return errorResponse(dbError.message, 500)
    return jsonResponse(data)
  }

  const { data, error: dbError } = await query
  if (dbError) return errorResponse(dbError.message, 500)

  return jsonResponse(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const provider = request.nextUrl.searchParams.get('provider')

  let query = supabase!
    .from('distribution_connections')
    .delete()
    .eq('show_id', showId)

  if (provider) {
    query = query.eq('provider', provider)
  }

  const { error: dbError } = await query
  if (dbError) return errorResponse(dbError.message, 500)

  return jsonResponse({ success: true })
}
