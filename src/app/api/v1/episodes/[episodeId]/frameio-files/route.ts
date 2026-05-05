import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getProvider } from '@/lib/integrations/registry'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  // Fetch episode and verify ownership via show → client → user_id chain
  const { data: episode, error: dbError } = await supabase!
    .from('episodes')
    .select('id, frameio_root_folder_id, shows(id, client_id, clients(user_id))')
    .eq('id', episodeId)
    .single()

  if (dbError || !episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { clients: { user_id: string } | null } | null
  const client = show?.clients
  if (!client || client.user_id !== user!.id) return errorResponse('Forbidden', 403)

  if (!episode.frameio_root_folder_id) {
    return errorResponse('This episode has no linked Frame.io project', 400)
  }

  ensureProvidersRegistered()

  try {
    const token = await getValidToken(user!.id, 'frame_io')
    const accountId = await getIntegrationAccountId(user!.id, 'frame_io')
    const provider = getProvider('frame_io')

    const cursor = request.nextUrl.searchParams.get('cursor') || undefined

    const result = await provider.listFolderContents!(token, accountId, episode.frameio_root_folder_id, cursor)
    return jsonResponse(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list Frame.io files'
    return errorResponse(message, 500)
  }
}
