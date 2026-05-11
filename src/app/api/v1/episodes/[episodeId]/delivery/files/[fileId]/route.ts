import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getProvider } from '@/lib/integrations/registry'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ episodeId: string; fileId: string }> }
) {
  const { episodeId, fileId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: episode } = await supabase!
    .from('episodes')
    .select('id, show_id, shows(id, client_id, clients(org_id))')
    .eq('id', episodeId)
    .single()

  if (!episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { clients: { org_id: string } | null } | null
  if (!show?.clients || show.clients.org_id !== org!.id) return errorResponse('Forbidden', 403)

  const { data: integration } = await supabase!
    .from('episode_integrations')
    .select('provider')
    .eq('episode_id', episodeId)
    .maybeSingle()

  if (!integration) return errorResponse('No delivery provider connected', 400)

  ensureProvidersRegistered()
  const provider = getProvider(integration.provider)

  if (!provider.deleteFile) {
    return errorResponse(`${provider.displayName} does not support file deletion`, 400)
  }

  try {
    const token = await getValidToken(org!.id, integration.provider)
    const accountId = await getIntegrationAccountId(org!.id, integration.provider)
    await provider.deleteFile(token, accountId, fileId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete file'
    return errorResponse(message, 500)
  }

  const { data: fileRef } = await supabase!
    .from('file_references')
    .select('id, name')
    .eq('external_id', fileId)
    .eq('episode_id', episodeId)
    .maybeSingle()

  if (fileRef) {
    await supabase!.from('file_references').delete().eq('id', fileRef.id)

    await supabase!.from('activity_log').insert({
      show_id: episode.show_id,
      episode_id: episodeId,
      action: 'file_deleted',
      description: `File deleted: ${fileRef.name}`,
      metadata: { provider: integration.provider, external_id: fileId },
    })
  }

  return new Response(null, { status: 204 })
}
