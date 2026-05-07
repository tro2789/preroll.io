import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('distribution_connections')
    .select('id, provider, external_show_id, external_show_name, created_at')
    .eq('show_id', showId)
    .maybeSingle()

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

  const { error: dbError } = await supabase!
    .from('distribution_connections')
    .delete()
    .eq('show_id', showId)

  if (dbError) return errorResponse(dbError.message, 500)

  return jsonResponse({ success: true })
}
