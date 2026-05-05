import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getProvider, isValidProvider } from '@/lib/integrations/registry'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerName } = await params
  const { user, error } = await getAuthenticatedClient()
  if (error) return error

  ensureProvidersRegistered()
  if (!isValidProvider(providerName)) return errorResponse(`Unknown provider: ${providerName}`, 400)

  try {
    const token = await getValidToken(user!.id, providerName)
    const accountId = await getIntegrationAccountId(user!.id, providerName)
    const provider = getProvider(providerName)

    const path = request.nextUrl.searchParams.get('path') || undefined
    const cursor = request.nextUrl.searchParams.get('cursor') || undefined

    const result = await provider.browse(token, accountId, path, cursor)
    return jsonResponse({ ...result, accountId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Browse failed'
    return errorResponse(message, 500)
  }
}
