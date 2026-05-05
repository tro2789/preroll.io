import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getProvider } from '@/lib/integrations/registry'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.name || typeof body.name !== 'string') return errorResponse('name is required')
  if (!body.file_size || typeof body.file_size !== 'number') return errorResponse('file_size is required')

  // Fetch episode and verify ownership via show → client → user_id chain
  const { data: episode, error: dbError } = await supabase!
    .from('episodes')
    .select('id, frameio_root_folder_id, shows(id, client_id, clients(user_id))')
    .eq('id', episodeId)
    .single()

  if (dbError || !episode) return errorResponse('Episode not found', 404)

  const client = (episode.shows as unknown as Record<string, unknown>)?.clients as { user_id: string } | null
  if (!client || client.user_id !== user!.id) return errorResponse('Forbidden', 403)

  if (!episode.frameio_root_folder_id) {
    return errorResponse('This episode has no linked Frame.io project', 400)
  }

  ensureProvidersRegistered()

  try {
    const token = await getValidToken(user!.id, 'frame_io')
    const accountId = await getIntegrationAccountId(user!.id, 'frame_io')
    const provider = getProvider('frame_io')

    const { fileId, uploadUrls } = await provider.createFileUpload!(
      token, accountId, episode.frameio_root_folder_id, body.name, body.file_size
    )

    return jsonResponse({ fileId, uploadUrls }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create Frame.io upload'
    return errorResponse(message, 500)
  }
}
