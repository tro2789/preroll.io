import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getProvider, isValidProvider } from '@/lib/integrations/registry'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerName } = await params
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  ensureProvidersRegistered()
  if (!isValidProvider(providerName)) return errorResponse(`Unknown provider: ${providerName}`, 400)

  const body = await request.json()
  if (!body.asset_ids?.length) return errorResponse('asset_ids is required')
  if (!body.name) return errorResponse('name is required')

  try {
    const token = await getValidToken(org!.id, providerName)
    const accountId = await getIntegrationAccountId(org!.id, providerName)
    const provider = getProvider(providerName)

    if (!provider.createShare) {
      return errorResponse(`${providerName} does not support share creation`, 400)
    }

    const share = await provider.createShare(token, accountId, body.asset_ids, body.name)
    return jsonResponse(share, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create share'
    return errorResponse(message, 500)
  }
}
