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

    if (!provider.listFolderContents) {
      return errorResponse(`${provider.displayName} does not support listing folder contents`, 400)
    }

    try {
      const folder = await provider.getFileDetails(token, accountId, integration.external_folder_id)
      if (!folder) {
        return errorResponse('Delivery folder no longer exists', 410)
      }
    } catch {
      return errorResponse('Delivery folder no longer exists or is inaccessible', 410)
    }

    const cursor = request.nextUrl.searchParams.get('cursor') || undefined
    const result = await provider.listFolderContents(token, accountId, integration.external_folder_id, cursor)

    return jsonResponse(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list files'
    const isNotFound = message.includes('404') || message.includes('not found') || message.includes('trashed')
    return errorResponse(message, isNotFound ? 410 : 500)
  }
}
