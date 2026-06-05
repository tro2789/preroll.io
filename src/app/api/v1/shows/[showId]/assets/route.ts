import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getShowForOrg } from '@/lib/api/ownership'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error
  if (!(await getShowForOrg(supabase!, showId, org!.id))) return errorResponse('Show not found', 404)

  const url = new URL(request.url)
  const episodeId = url.searchParams.get('episode_id')
  const assetType = url.searchParams.get('type')

  let query = supabase!
    .from('assets')
    .select('*')
    .eq('show_id', showId)
    .order('created_at', { ascending: false })

  if (episodeId) {
    query = query.eq('episode_id', episodeId)
  }

  if (assetType) {
    query = query.eq('asset_type', assetType)
  }

  const { data, error: dbError } = await query

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error
  if (!(await getShowForOrg(supabase!, showId, org!.id))) return errorResponse('Show not found', 404)

  const body = await request.json()
  const { name, file_key, asset_type, episode_id, file_size, mime_type } = body

  if (!name || !file_key || !asset_type) {
    return errorResponse('name, file_key, and asset_type are required', 400)
  }

  const insertData: Record<string, unknown> = {
    show_id: showId,
    name,
    file_key,
    asset_type,
  }

  if (episode_id) insertData.episode_id = episode_id
  if (file_size) insertData.file_size = file_size
  if (mime_type) insertData.mime_type = mime_type

  const { data, error: dbError } = await supabase!
    .from('assets')
    .insert(insertData)
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data, 201)
}
