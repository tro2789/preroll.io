import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getUploadUrl } from '@/lib/r2/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: episode, error: dbError } = await supabase!
    .from('episodes')
    .select('id, show_id, shows(client_id, clients(user_id))')
    .eq('id', episodeId)
    .single()

  if (dbError || !episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { clients: { user_id: string } | null } | null
  if (!show?.clients || show.clients.user_id !== user!.id) return errorResponse('Forbidden', 403)

  const body = await request.json()
  const { filename, contentType, assetType } = body

  if (!filename || !contentType || !assetType) {
    return errorResponse('filename, contentType, and assetType are required', 400)
  }

  const uuid = crypto.randomUUID()
  const fileKey = `episodes/${episode.show_id}/${episodeId}/${assetType}/${uuid}-${filename}`

  const uploadUrl = await getUploadUrl(fileKey, contentType)

  return jsonResponse({ uploadUrl, fileKey })
}
