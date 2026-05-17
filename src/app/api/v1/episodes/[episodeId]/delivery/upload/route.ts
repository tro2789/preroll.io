import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getProvider } from '@/lib/integrations/registry'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'
import { getUploadUrl, createMultipartUpload, shouldUseMultipart } from '@/lib/r2/client'
import { checkQuota, incrementUsage } from '@/lib/storage/usage'
import { formatFileSize } from '@/lib/format'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.name || typeof body.name !== 'string') return errorResponse('name is required')
  if (!body.file_size || typeof body.file_size !== 'number') return errorResponse('file_size is required')

  const { data: episode, error: dbError } = await supabase!
    .from('episodes')
    .select('id, show_id, shows(id, client_id, clients(org_id))')
    .eq('id', episodeId)
    .single()

  if (dbError || !episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { id: string; clients: { org_id: string } | null } | null
  if (!show?.clients || show.clients.org_id !== org!.id) return errorResponse('Forbidden', 403)

  const { data: integration } = await supabase!
    .from('episode_integrations')
    .select('provider, external_folder_id')
    .eq('episode_id', episodeId)
    .maybeSingle()

  if (integration?.external_folder_id) {
    return uploadToExternalProvider(supabase!, user!.id, org!.id, episodeId, integration, body)
  }

  return uploadToR2(supabase!, user!.id, org!.id, episodeId, show.id, body)
}

async function uploadToR2(
  supabase: NonNullable<Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase']>,
  userId: string,
  orgId: string,
  episodeId: string,
  showId: string,
  body: { name: string; file_size: number; mime_type?: string }
) {
  const { allowed, usage } = await checkQuota(orgId, body.file_size)
  if (!allowed) {
    return errorResponse(
      `Storage quota exceeded. Used ${formatFileSize(usage.usedBytes)} of ${formatFileSize(usage.limitBytes!)}. Upgrade your plan for more storage.`,
      402
    )
  }

  const uuid = crypto.randomUUID()
  const key = `delivery/${showId}/${episodeId}/${uuid}-${body.name}`
  const contentType = body.mime_type || 'application/octet-stream'

  let uploadResponse: Record<string, unknown>

  if (shouldUseMultipart(body.file_size)) {
    const multipart = await createMultipartUpload(key, contentType, body.file_size)
    uploadResponse = {
      fileId: key,
      uploadId: multipart.uploadId,
      parts: multipart.parts,
      uploadProtocol: 'presigned-chunks',
    }
  } else {
    const uploadUrl = await getUploadUrl(key, contentType)
    uploadResponse = {
      fileId: key,
      uploadUrls: [{ url: uploadUrl, size: body.file_size }],
      uploadProtocol: 'presigned-chunks',
    }
  }

  await supabase.from('file_references').insert({
    user_id: userId,
    org_id: orgId,
    provider: 'r2',
    external_id: key,
    name: body.name,
    file_size: body.file_size,
    mime_type: body.mime_type || null,
    episode_id: episodeId,
  })

  await incrementUsage(orgId, body.file_size)

  return jsonResponse(uploadResponse, 201)
}

async function uploadToExternalProvider(
  supabase: NonNullable<Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase']>,
  userId: string,
  orgId: string,
  episodeId: string,
  integration: { provider: string; external_folder_id: string },
  body: { name: string; file_size: number; mime_type?: string }
) {
  ensureProvidersRegistered()

  try {
    const providerName = integration.provider as Parameters<typeof getProvider>[0]
    const token = await getValidToken(orgId, providerName)
    const accountId = await getIntegrationAccountId(orgId, providerName)
    const provider = getProvider(providerName)

    if (!provider.createFileUpload) {
      return errorResponse(`${provider.displayName} does not support file uploads`, 400)
    }

    const result = await provider.createFileUpload(
      token, accountId, integration.external_folder_id, body.name, body.file_size
    )

    await supabase.from('file_references').insert({
      user_id: userId,
      org_id: orgId,
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

