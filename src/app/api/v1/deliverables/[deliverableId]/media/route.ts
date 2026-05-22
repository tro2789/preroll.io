import { NextRequest } from 'next/server'
import { getAuthenticatedClientOrPortalUser, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { getDownloadUrl } from '@/lib/r2/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  const { deliverableId } = await params
  const { supabase, org, portalUserId, error } = await getAuthenticatedClientOrPortalUser()
  if (error) return error

  const stream = request.nextUrl.searchParams.get('stream')
  if (stream === 'google_drive') {
    return streamGoogleDrive(supabase!, deliverableId)
  }

  const { data: deliverable, error: dbError } = await supabase!
    .from('deliverables')
    .select('*, shows(client_id, clients(org_id, client_user_id))')
    .eq('id', deliverableId)
    .single()

  if (dbError || !deliverable) return errorResponse('Deliverable not found', 404)

  const show = (deliverable as unknown as { shows: { clients: { org_id: string; client_user_id: string | null } } }).shows
  const producerOrgId = show?.clients?.org_id
  if (!producerOrgId) return errorResponse('Could not resolve producer for this deliverable', 404)

  if (portalUserId) {
    if (show?.clients?.client_user_id !== portalUserId) return errorResponse('Forbidden', 403)
  } else if (producerOrgId !== org!.id) {
    return errorResponse('Forbidden', 403)
  }

  // Support loading a specific version via file_reference_id query param
  const specificFileRefId = request.nextUrl.searchParams.get('file_reference_id')

  let fileRef: FileRef | null = null
  if (specificFileRefId) {
    // Verify the requested file_reference belongs to the same version group as the deliverable
    const { data: deliverableData } = await supabase!
      .from('deliverables')
      .select('version_group_id')
      .eq('id', deliverableId)
      .single()

    if (deliverableData?.version_group_id) {
      const { data: ref } = await supabase!
        .from('file_references')
        .select('id, external_id, mime_type, duration_seconds, provider')
        .eq('id', specificFileRefId)
        .eq('version_group_id', deliverableData.version_group_id)
        .single()
      fileRef = ref
    }
  }

  if (!fileRef && deliverable.file_reference_id) {
    const { data: ref } = await supabase!
      .from('file_references')
      .select('id, external_id, mime_type, duration_seconds, provider')
      .eq('id', deliverable.file_reference_id)
      .single()
    fileRef = ref
  }

  if (!fileRef) {
    const { data: ref, error: refError } = await supabase!
      .from('file_references')
      .select('id, external_id, mime_type, duration_seconds, provider')
      .eq('deliverable_id', deliverableId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (refError || !ref) return errorResponse('No file linked to this deliverable', 404)
    fileRef = ref
  }

  ensureProvidersRegistered()

  if (fileRef.provider === 'r2') {
    return resolveR2(fileRef)
  }
  if (fileRef.provider === 'frame_io') {
    return resolveFrameIo(producerOrgId, fileRef)
  }
  if (fileRef.provider === 'google_drive') {
    return resolveGoogleDrive(deliverableId, fileRef)
  }
  if (fileRef.provider === 'vimeo') {
    return resolveVimeo(producerOrgId, fileRef)
  }

  return errorResponse(`Playback not supported for provider: ${fileRef.provider}`, 400)
}

interface FileRef {
  id: string
  external_id: string
  mime_type: string | null
  duration_seconds: number | null
  provider: string
}

async function resolveR2(fileRef: FileRef) {
  const url = await getDownloadUrl(fileRef.external_id)
  return jsonResponse({
    url,
    mime_type: fileRef.mime_type,
    duration_seconds: fileRef.duration_seconds,
    status: 'ready',
    file_reference_id: fileRef.id,
  })
}

async function resolveFrameIo(producerOrgId: string, fileRef: FileRef) {
  let token: string
  let accountId: string
  try {
    ;[token, accountId] = await Promise.all([
      getValidToken(producerOrgId, 'frame_io'),
      getIntegrationAccountId(producerOrgId, 'frame_io'),
    ])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get Frame.io credentials'
    return errorResponse(message, 502)
  }

  const frameRes = await fetch(
    `https://api.frame.io/v4/accounts/${accountId}/files/${fileRef.external_id}?include=media_links.original,media_links.high_quality,media_links.efficient`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!frameRes.ok) return errorResponse(`Frame.io API error: ${frameRes.status}`, 502)

  const json = await frameRes.json()
  const fileData = json.data || json

  const notReady = ['uploading', 'processing', 'transcoding']
  if (fileData.status && notReady.includes(fileData.status)) {
    return jsonResponse({ status: 'processing', mime_type: fileRef.mime_type })
  }

  const ml = fileData.media_links || {}
  const url = ml.original?.download_url || ml.original?.inline_url
    || ml.high_quality?.download_url || ml.efficient?.download_url || null

  if (!url) return errorResponse('No playback URL available from Frame.io', 502)

  return jsonResponse({
    url,
    mime_type: fileRef.mime_type,
    duration_seconds: fileRef.duration_seconds,
    status: 'ready',
    file_reference_id: fileRef.id,
  })
}

function resolveGoogleDrive(deliverableId: string, fileRef: FileRef) {
  return jsonResponse({
    url: `/api/v1/deliverables/${deliverableId}/media?stream=google_drive`,
    mime_type: fileRef.mime_type,
    duration_seconds: fileRef.duration_seconds,
    status: 'ready',
    file_reference_id: fileRef.id,
  })
}

async function streamGoogleDrive(
  supabase: NonNullable<Awaited<ReturnType<typeof getAuthenticatedClientOrPortalUser>>['supabase']>,
  deliverableId: string
) {
  const { data: deliverable } = await supabase
    .from('deliverables')
    .select('id, shows(client_id, clients(org_id))')
    .eq('id', deliverableId)
    .single()

  if (!deliverable) return errorResponse('Not found', 404)

  const show = (deliverable as unknown as { shows: { clients: { org_id: string } } }).shows
  const producerOrgId = show?.clients?.org_id
  if (!producerOrgId) return errorResponse('Not found', 404)

  const { data: fileRef } = await supabase
    .from('file_references')
    .select('external_id, mime_type, provider')
    .eq('deliverable_id', deliverableId)
    .eq('provider', 'google_drive')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!fileRef) return errorResponse('No Google Drive file linked', 404)

  ensureProvidersRegistered()
  const token = await getValidToken(producerOrgId, 'google_drive')

  const driveRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileRef.external_id}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!driveRes.ok || !driveRes.body) {
    return errorResponse(`Google Drive error: ${driveRes.status}`, 502)
  }

  return new Response(driveRes.body, {
    headers: {
      'Content-Type': fileRef.mime_type || 'video/mp4',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}

async function resolveVimeo(producerOrgId: string, fileRef: FileRef) {
  let token: string
  try {
    token = await getValidToken(producerOrgId, 'vimeo')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get Vimeo credentials'
    return errorResponse(message, 502)
  }

  const res = await fetch(
    `https://api.vimeo.com/videos/${fileRef.external_id}?fields=files,status,duration`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.vimeo.*+json;version=3.4',
      },
    }
  )

  if (!res.ok) return errorResponse(`Vimeo API error: ${res.status}`, 502)

  const video = await res.json()

  if (video.status !== 'available') {
    return jsonResponse({ status: 'processing', mime_type: fileRef.mime_type })
  }

  const files = video.files as Array<{ quality: string; link: string; type: string }> | undefined
  if (!files || files.length === 0) {
    return errorResponse('No direct playback files available from Vimeo (requires Vimeo Pro or higher)', 400)
  }

  const preferred = files.find((f) => f.quality === 'hd') ||
    files.find((f) => f.quality === 'sd') ||
    files[0]

  return jsonResponse({
    url: preferred.link,
    mime_type: preferred.type || fileRef.mime_type,
    duration_seconds: video.duration || fileRef.duration_seconds,
    status: 'ready',
    file_reference_id: fileRef.id,
  })
}
