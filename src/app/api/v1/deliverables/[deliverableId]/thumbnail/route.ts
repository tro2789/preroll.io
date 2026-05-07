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

  const { data: deliverable } = await supabase!
    .from('deliverables')
    .select('id, shows(client_id, clients(user_id))')
    .eq('id', deliverableId)
    .single()

  if (!deliverable) return errorResponse('Deliverable not found', 404)

  const show = (deliverable as unknown as { shows: { clients: { user_id: string } } }).shows
  const producerUserId = show?.clients?.user_id
  if (!producerUserId) return errorResponse('Not found', 404)

  const { data: fileRef } = await supabase!
    .from('file_references')
    .select('id, external_id, thumbnail_url, provider')
    .eq('deliverable_id', deliverableId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!fileRef) return errorResponse('No file linked', 404)

  if (fileRef.thumbnail_url) {
    return jsonResponse({ url: fileRef.thumbnail_url })
  }

  if (fileRef.provider !== 'frame_io') {
    return jsonResponse({ url: null })
  }

  ensureProvidersRegistered()
  try {
    const [token, accountId] = await Promise.all([
      getValidToken(producerUserId, 'frame_io'),
      getIntegrationAccountId(producerUserId, 'frame_io'),
    ])

    const frameRes = await fetch(
      `https://api.frame.io/v4/accounts/${accountId}/files/${fileRef.external_id}?include=media_links.thumbnail`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!frameRes.ok) return jsonResponse({ url: null })

    const json = await frameRes.json()
    const fileData = json.data || json
    const thumbUrl =
      fileData.media_links?.thumbnail?.url ||
      fileData.thumb_360 ||
      fileData.thumb ||
      fileData.thumbnail_url ||
      null

    return jsonResponse({ url: thumbUrl })
  } catch {
    return jsonResponse({ url: null })
  }
}
