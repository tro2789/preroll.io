import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/integrations/crypto'

async function verifyShowAccess(showId: string, orgId: string) {
  const service = createServiceClient()
  const { data: show } = await service
    .from('shows')
    .select('id, client_id, clients!inner(org_id)')
    .eq('id', showId)
    .single()

  if (!show) return false
  const clients = show.clients as unknown as { org_id: string }
  return clients.org_id === orgId
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const hasAccess = await verifyShowAccess(showId, org!.id)
  if (!hasAccess) return errorResponse('Show not found', 404)

  const body = await request.json()
  const { provider } = body

  if (!provider) return errorResponse('provider is required', 400)

  const service = createServiceClient()
  const { data: connection, error: dbError } = await service
    .from('analytics_connections')
    .select('id, provider, credentials_enc')
    .eq('show_id', showId)
    .eq('org_id', org!.id)
    .eq('provider', provider)
    .maybeSingle()

  if (dbError) return errorResponse(dbError.message, 500)
  if (!connection) return errorResponse('No connection found for this provider', 404)

  if (provider === 'apple') {
    if (!connection.credentials_enc) {
      return errorResponse('No credentials stored for this Apple connection', 400)
    }

    try {
      const raw = decrypt(connection.credentials_enc)
      const creds = JSON.parse(raw)

      if (!creds.private_key || !creds.key_id || !creds.issuer_id) {
        return errorResponse('Stored credentials are incomplete. Missing private_key, key_id, or issuer_id.', 400)
      }

      return jsonResponse({ success: true, message: 'Apple credentials are valid and complete.' })
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error'
      return errorResponse(`Failed to verify Apple credentials: ${detail}`, 400)
    }
  }

  if (provider === 'spotify_csv') {
    return jsonResponse({ success: true, message: 'Spotify CSV does not require credential verification.' })
  }

  if (provider === 'transistor' || provider === 'castopod') {
    return jsonResponse({ success: true, message: `${provider} analytics reuses the distribution connection. No separate credentials to verify.` })
  }

  return errorResponse('Unsupported provider', 400)
}
