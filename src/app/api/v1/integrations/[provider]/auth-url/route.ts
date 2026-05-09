import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getOrgEntitlements } from '@/lib/entitlements'
import { requireRole } from '@/lib/org/roles'
import { getProvider, isValidProvider } from '@/lib/integrations/registry'
import { ensureProvidersRegistered } from '@/lib/integrations/init'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerName } = await params
  const { user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'admin')
  if (roleError) return roleError

  const entitlements = await getOrgEntitlements(org!.id, org!.planId, org!.trialEndsAt)
  if (!entitlements.can('integrations')) {
    return errorResponse('Upgrade to Pro to connect integrations.', 403)
  }

  ensureProvidersRegistered()

  if (!isValidProvider(providerName)) {
    return errorResponse(`Unknown provider: ${providerName}`, 400)
  }

  const provider = getProvider(providerName)
  const nonce = crypto.randomUUID()

  const state = Buffer.from(JSON.stringify({
    userId: user!.id,
    provider: providerName,
    nonce,
  })).toString('base64url')

  const origin = request.nextUrl.origin
  const redirectUri = `${origin}${provider.oauthConfig.callbackPath}`
  const url = provider.getAuthUrl(state, redirectUri)

  const cookieStore = await cookies()
  cookieStore.set('oauth_nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return jsonResponse({ url })
}
