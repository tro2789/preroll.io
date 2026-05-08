import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getProvider, isValidProvider } from '@/lib/integrations/registry'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'
import type { IntegrationProvider } from '@/lib/integrations/types'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ referenceId: string }> }
) {
  const { referenceId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('file_references')
    .select('*')
    .eq('id', referenceId)
    .single()

  if (dbError || !data) return errorResponse('File reference not found', 404)

  const url = new URL(request.url)
  const refresh = url.searchParams.get('refresh') === 'true'

  if (refresh && isValidProvider(data.provider)) {
    ensureProvidersRegistered()
    try {
      const token = await getValidToken(org!.id, data.provider as IntegrationProvider)
      const accountId = await getIntegrationAccountId(org!.id, data.provider as IntegrationProvider)
      const provider = getProvider(data.provider as IntegrationProvider)
      const details = await provider.getFileDetails(token, accountId, data.external_id)

      const newThumb = details.thumbnailUrl || data.thumbnail_url
      const updates: Record<string, unknown> = {
        thumbnail_url: newThumb,
        provider_metadata: { ...data.provider_metadata, ...details.metadata },
      }

      await supabase!.from('file_references').update(updates).eq('id', referenceId)

      if (newThumb && data.episode_id) {
        const { data: ep } = await supabase!
          .from('episodes')
          .select('image_url')
          .eq('id', data.episode_id)
          .single()
        if (ep && !ep.image_url) {
          await supabase!.from('episodes').update({ image_url: newThumb }).eq('id', data.episode_id)
        }
      }

      return jsonResponse({ ...data, ...updates })
    } catch {
      return jsonResponse(data)
    }
  }

  return jsonResponse(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ referenceId: string }> }
) {
  const { referenceId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const allowed = ['provider_metadata', 'thumbnail_url', 'external_url', 'name']
  const updates: Record<string, unknown> = {}
  for (const field of allowed) {
    if (field in body) updates[field] = body[field]
  }

  if (Object.keys(updates).length === 0) return errorResponse('No valid fields to update')

  const { data, error: dbError } = await supabase!
    .from('file_references')
    .update(updates)
    .eq('id', referenceId)
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ referenceId: string }> }
) {
  const { referenceId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: ref } = await supabase!
    .from('file_references')
    .select('name, episode_id, episodes(show_id)')
    .eq('id', referenceId)
    .single()

  const { error: dbError } = await supabase!
    .from('file_references')
    .delete()
    .eq('id', referenceId)

  if (dbError) return errorResponse(dbError.message, 500)

  if (ref?.episode_id) {
    const episode = ref.episodes as unknown as { show_id: string } | null
    if (episode) {
      await supabase!.from('activity_log').insert({
        show_id: episode.show_id,
        episode_id: ref.episode_id,
        action: 'file_unlinked',
        description: `File unlinked: ${ref.name}`,
      })
    }
  }

  return new Response(null, { status: 204 })
}
