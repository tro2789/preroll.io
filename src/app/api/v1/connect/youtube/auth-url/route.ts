import { NextRequest } from 'next/server'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'
import { verifyInviteToken } from '@/lib/integrations/invite-token'

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.upload',
]

export async function GET(request: NextRequest) {
  const inviteToken = request.nextUrl.searchParams.get('token')
  if (!inviteToken) return errorResponse('Missing token', 400)

  const payload = verifyInviteToken(inviteToken)
  if (!payload) return errorResponse('Invalid or expired invite link', 401)

  const clientId = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_DRIVE_CLIENT_ID || ''
  if (!clientId) return errorResponse('YouTube OAuth is not configured', 500)

  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/connect/youtube/callback`

  const state = Buffer.from(JSON.stringify({
    inviteToken,
    showId: payload.showId,
    orgId: payload.orgId,
  })).toString('base64url')

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  })

  return jsonResponse({ url: `${GOOGLE_AUTH}?${params.toString()}` })
}
