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
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: episode, error: dbError } = await supabase!
    .from('episodes')
    .select('id, shows(id, client_id, clients(org_id))')
    .eq('id', episodeId)
    .single()

  if (dbError || !episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { clients: { org_id: string } | null } | null
  if (!show?.clients || show.clients.org_id !== org!.id) return errorResponse('Forbidden', 403)

  const { data: integration } = await supabase!
    .from('episode_integrations')
    .select('provider, external_folder_id')
    .eq('episode_id', episodeId)
    .maybeSingle()

  if (!integration || !integration.external_folder_id) {
    // No external integration — list R2 files from file_references
    const { data: r2Files } = await supabase!
      .from('file_references')
      .select('id, external_id, name, mime_type, file_size, duration_seconds, created_at')
      .eq('episode_id', episodeId)
      .eq('provider', 'r2')
      .order('created_at', { ascending: false })

    return jsonResponse({
      items: (r2Files || []).map((f) => ({
        id: f.external_id,
        name: f.name,
        type: 'file' as const,
        mimeType: f.mime_type,
        fileSize: f.file_size,
        durationSeconds: f.duration_seconds,
        createdAt: f.created_at,
      })),
      breadcrumb: [],
      pagination: { hasMore: false },
    })
  }

  ensureProvidersRegistered()

  try {
    const token = await getValidToken(org!.id, integration.provider)
    const accountId = await getIntegrationAccountId(org!.id, integration.provider)
    const provider = getProvider(integration.provider)

    if (!provider.listFolderContents) {
      return errorResponse(`${provider.displayName} does not support listing folder contents`, 400)
    }

    const cursor = request.nextUrl.searchParams.get('cursor') || undefined
    const result = await provider.listFolderContents(token, accountId, integration.external_folder_id, cursor)

    // Overlay versioning data from file_references
    const { data: allRefs } = await supabase!
      .from('file_references')
      .select('external_id, version_group_id, version_number, is_latest')
      .eq('episode_id', episodeId)

    if (allRefs && allRefs.length > 0) {
      const groupCounts = new Map<string, number>()
      for (const ref of allRefs) {
        groupCounts.set(ref.version_group_id, (groupCounts.get(ref.version_group_id) || 0) + 1)
      }

      const latestByExternalId = new Map<string, { version_number: number; version_count: number; version_group_id: string }>()
      const hiddenExternalIds = new Set<string>()
      for (const ref of allRefs) {
        if (ref.external_id && ref.is_latest) {
          latestByExternalId.set(ref.external_id, {
            version_number: ref.version_number,
            version_count: groupCounts.get(ref.version_group_id) || 1,
            version_group_id: ref.version_group_id,
          })
        }
        if (ref.external_id && !ref.is_latest) {
          hiddenExternalIds.add(ref.external_id)
        }
      }

      result.items = result.items
        .filter((item) => !hiddenExternalIds.has(item.id))
        .map((item) => {
          const info = latestByExternalId.get(item.id)
          if (info && info.version_count > 1) {
            return { ...item, version_number: info.version_number, version_count: info.version_count, version_group_id: info.version_group_id }
          }
          return item
        })
    }

    return jsonResponse(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list files'
    const isNotFound = message.includes('404') || message.includes('not found') || message.includes('trashed')
    return errorResponse(message, isNotFound ? 410 : 500)
  }
}
