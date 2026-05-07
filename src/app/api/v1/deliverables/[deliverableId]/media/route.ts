import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'
import { ensureProvidersRegistered } from '@/lib/integrations/init'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  const { deliverableId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  // Fetch deliverable with ownership chain to get producer's user_id
  const { data: deliverable, error: dbError } = await supabase!
    .from('deliverables')
    .select('*, shows(client_id, clients(user_id))')
    .eq('id', deliverableId)
    .single()

  if (dbError || !deliverable) return errorResponse('Deliverable not found', 404)

  const show = (deliverable as unknown as { shows: { clients: { user_id: string } } }).shows
  const producerUserId = show?.clients?.user_id
  if (!producerUserId) return errorResponse('Could not resolve producer for this deliverable', 404)

  // Find Frame.io file reference linked to this deliverable
  const { data: fileRef, error: refError } = await supabase!
    .from('file_references')
    .select('id, external_id, mime_type, duration_seconds')
    .eq('deliverable_id', deliverableId)
    .eq('provider', 'frame_io')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (refError || !fileRef) return errorResponse('No Frame.io file linked to this deliverable', 404)

  // Get producer's Frame.io token and account ID
  ensureProvidersRegistered()
  let token: string
  let accountId: string
  try {
    ;[token, accountId] = await Promise.all([
      getValidToken(producerUserId, 'frame_io'),
      getIntegrationAccountId(producerUserId, 'frame_io'),
    ])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get Frame.io credentials'
    return errorResponse(message, 502)
  }

  // Fetch file data from Frame.io V4 API
  const frameRes = await fetch(
    `https://api.frame.io/v4/accounts/${accountId}/files/${fileRef.external_id}?include=media_links.high_quality,media_links.efficient`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  if (!frameRes.ok) {
    return errorResponse(`Frame.io API error: ${frameRes.status}`, 502)
  }

  const json = await frameRes.json()
  const fileData = json.data || json

  // Check if the file is still processing
  const notReady = ['uploading', 'processing', 'transcoding']
  if (fileData.status && notReady.includes(fileData.status)) {
    return jsonResponse({
      status: 'processing',
      mime_type: fileRef.mime_type,
    })
  }

  const hq = fileData.media_links?.high_quality
  const eff = fileData.media_links?.efficient
  const url =
    hq?.url || hq?.download_url ||
    eff?.url || eff?.download_url ||
    null

  if (!url) {
    return errorResponse('No playback URL available from Frame.io', 502)
  }

  return jsonResponse({
    url,
    mime_type: fileRef.mime_type,
    duration_seconds: fileRef.duration_seconds,
    status: 'ready',
    file_reference_id: fileRef.id,
  })
}
