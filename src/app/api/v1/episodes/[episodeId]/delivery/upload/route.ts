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

  const { data: episode, error: dbError } = await supabase!
    .from('episodes')
    .select('id, shows(id, client_id, clients(user_id))')
    .eq('id', episodeId)
    .single()

  if (dbError || !episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { clients: { user_id: string } | null } | null
  if (!show?.clients || show.clients.user_id !== user!.id) return errorResponse('Forbidden', 403)

  const { data: integration } = await supabase!
    .from('episode_integrations')
    .select('provider, external_folder_id')
    .eq('episode_id', episodeId)
    .maybeSingle()

  if (!integration || !integration.external_folder_id) {
    return errorResponse('This episode has no delivery provider with a linked folder', 400)
  }

  ensureProvidersRegistered()

  try {
    const token = await getValidToken(user!.id, integration.provider)
    const accountId = await getIntegrationAccountId(user!.id, integration.provider)
    const provider = getProvider(integration.provider)

    if (!provider.createFileUpload) {
      return errorResponse(`${provider.displayName} does not support file uploads`, 400)
    }

    const result = await provider.createFileUpload(
      token, accountId, integration.external_folder_id, body.name, body.file_size
    )

    await supabase!.from('file_references').insert({
      user_id: user!.id,
      provider: integration.provider,
      external_id: result.fileId,
      name: body.name,
      file_size: body.file_size,
      mime_type: body.mime_type || null,
      episode_id: episodeId,
    })

    return jsonResponse({
      fileId: result.fileId,
      uploadUrls: result.uploadUrls,
      resumableUrl: result.resumableUrl,
      tusUrl: result.tusUrl,
      uploadProtocol: provider.capabilities.uploadProtocol,
    }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to initiate upload'
    const isNotFound = message.includes('404') || message.includes('not found') || message.includes('trashed')
    return errorResponse(message, isNotFound ? 410 : 500)
  }
}
