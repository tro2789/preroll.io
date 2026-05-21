import { NextRequest } from 'next/server'
import { getAuthenticatedClient, errorResponse } from '@/lib/api/helpers'
import { getProvider } from '@/lib/integrations/registry'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'
import { deleteObject } from '@/lib/r2/client'
import { decrementUsage } from '@/lib/storage/usage'

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

  let { data: fileRef } = await supabase!
    .from('file_references')
    .select('id, name, provider, external_id, file_size')
    .eq('external_id', fileId)
    .eq('episode_id', episodeId)
    .maybeSingle()

  if (!fileRef) {
    const { data: byId } = await supabase!
      .from('file_references')
      .select('id, name, provider, external_id, file_size')
      .eq('id', fileId)
      .eq('episode_id', episodeId)
      .maybeSingle()
    fileRef = byId
  }

  if (fileRef?.provider === 'r2') {
    try {
      await deleteObject(fileRef.external_id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete file from storage'
      return errorResponse(message, 500)
    }

    await supabase!
      .from('deliverables')
      .update({ file_reference_id: null })
      .eq('file_reference_id', fileRef.id)

    await Promise.all([
      supabase!.from('file_references').delete().eq('id', fileRef.id),
      fileRef.file_size ? decrementUsage(org!.id, fileRef.file_size) : null,
      supabase!.from('activity_log').insert({
        show_id: episode.show_id,
        episode_id: episodeId,
        action: 'file_deleted',
        description: `File deleted: ${fileRef.name}`,
        metadata: { provider: 'r2', external_id: fileId },
      }),
    ])

    return new Response(null, { status: 204 })
  }

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

  if (fileRef) {
    await supabase!
      .from('deliverables')
      .update({ file_reference_id: null })
      .eq('file_reference_id', fileRef.id)

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
