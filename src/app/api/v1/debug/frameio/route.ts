import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'

export async function GET(request: NextRequest) {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const fileExternalId = request.nextUrl.searchParams.get('file_id')
  if (!fileExternalId) return errorResponse('file_id query param required')

  const token = await getValidToken(org!.id, 'frame_io')
  const accountId = await getIntegrationAccountId(org!.id, 'frame_io')

  const frameRes = await fetch(
    `https://api.frame.io/v4/accounts/${accountId}/files/${fileExternalId}?include=media_links.original,media_links.high_quality,media_links.efficient`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  const body = await frameRes.json()

  const supabase = createServiceClient()
  await supabase.from('webhook_events').insert({
    provider: 'debug',
    event_type: 'frameio_file_details',
    external_id: fileExternalId,
    payload: body,
  })

  return jsonResponse({ stored: true, status: frameRes.status })
}
