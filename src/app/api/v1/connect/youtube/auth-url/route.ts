import { NextRequest } from 'next/server'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'
import { verifyInviteToken } from '@/lib/integrations/invite-token'
import { getOAuthConfig } from '@/lib/integrations/providers/youtube'

export async function GET(request: NextRequest) {
  const inviteToken = request.nextUrl.searchParams.get('token')
  if (!inviteToken) return errorResponse('Missing token', 400)

  const payload = verifyInviteToken(inviteToken)
  if (!payload) return errorResponse('Invalid or expired invite link', 401)

  const config = getOAuthConfig()
  if (!config.clientId) return errorResponse('YouTube OAuth is not configured', 500)

  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/connect/youtube/callback`

  const state = Buffer.from(JSON.stringify({
    inviteToken,
    showId: payload.showId,
    orgId: payload.orgId,
  })).toString('base64url')

  const ytScopes = config.scopes.filter(s => s.includes('youtube'))

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: ytScopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  })

  return jsonResponse({ url: `${config.authUrl}?${params.toString()}` })
}
