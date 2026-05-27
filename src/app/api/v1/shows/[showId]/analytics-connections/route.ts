import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/integrations/crypto'

const SUPPORTED_PROVIDERS = ['apple', 'spotify_csv', 'transistor', 'castopod']

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const hasAccess = await verifyShowAccess(showId, org!.id)
  if (!hasAccess) return errorResponse('Show not found', 404)

  const service = createServiceClient()
  const provider = request.nextUrl.searchParams.get('provider')

  const query = service
    .from('analytics_connections')
    .select('id, show_id, org_id, provider, external_show_id, last_synced_at, sync_status, sync_error, created_at, updated_at')
    .eq('show_id', showId)
    .eq('org_id', org!.id)

  if (provider) {
    const { data, error: dbError } = await query.eq('provider', provider).maybeSingle()
    if (dbError) return errorResponse(dbError.message, 500)
    return jsonResponse(data)
  }

  const { data, error: dbError } = await query
  if (dbError) return errorResponse(dbError.message, 500)

  return jsonResponse(data)
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
  const { provider, credentials, external_show_id } = body

  if (!provider || !SUPPORTED_PROVIDERS.includes(provider)) {
    return errorResponse(`Unsupported provider. Supported: ${SUPPORTED_PROVIDERS.join(', ')}`, 400)
  }

  let credentialsEnc: string | null = null

  if (provider === 'apple') {
    if (!credentials) return errorResponse('credentials are required for Apple', 400)
    const { private_key, key_id, issuer_id } = credentials
    if (!private_key) return errorResponse('credentials.private_key is required', 400)
    if (!key_id) return errorResponse('credentials.key_id is required', 400)
    if (!issuer_id) return errorResponse('credentials.issuer_id is required', 400)
    credentialsEnc = encrypt(JSON.stringify({ private_key, key_id, issuer_id }))
  }
  // spotify_csv, transistor, castopod — no credentials stored here

  const service = createServiceClient()
  const { data, error: dbError } = await service
    .from('analytics_connections')
    .upsert(
      {
        show_id: showId,
        org_id: org!.id,
        provider,
        credentials_enc: credentialsEnc,
        external_show_id: external_show_id || null,
      },
      { onConflict: 'show_id,provider' }
    )
    .select('id, show_id, org_id, provider, external_show_id, last_synced_at, sync_status, sync_error, created_at, updated_at')
    .single()

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data, 201)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const hasAccess = await verifyShowAccess(showId, org!.id)
  if (!hasAccess) return errorResponse('Show not found', 404)

  const provider = request.nextUrl.searchParams.get('provider')
  if (!provider) return errorResponse('provider query param is required', 400)

  const service = createServiceClient()
  const { error: dbError } = await service
    .from('analytics_connections')
    .delete()
    .eq('show_id', showId)
    .eq('org_id', org!.id)
    .eq('provider', provider)

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse({ success: true })
}
