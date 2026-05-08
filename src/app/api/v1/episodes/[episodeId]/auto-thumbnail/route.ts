import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { persistExternalThumbnail } from '@/lib/r2/client'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const { thumbnail_url } = body as { thumbnail_url?: string }

  if (!thumbnail_url) return errorResponse('thumbnail_url is required')

  const { data: episode, error: dbError } = await supabase!
    .from('episodes')
    .select('id, image_url, shows(client_id, clients(org_id))')
    .eq('id', episodeId)
    .single()

  if (dbError || !episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { clients: { org_id: string } | null } | null
  if (!show?.clients || show.clients.org_id !== org!.id) return errorResponse('Forbidden', 403)

  if (episode.image_url) {
    return jsonResponse({ updated: false, reason: 'episode already has a thumbnail' })
  }

  const r2Url = await persistExternalThumbnail(thumbnail_url, 'episodes', episodeId)
  await supabase!.from('episodes').update({ image_url: r2Url || thumbnail_url }).eq('id', episodeId)

  return jsonResponse({ updated: true })
}
