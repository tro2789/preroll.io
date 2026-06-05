import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyInviteToken } from '@/lib/integrations/invite-token'
import { encrypt, decrypt } from '@/lib/integrations/crypto'

export async function POST(request: NextRequest) {
  const { state: stateParam, channelId } = await request.json()

  if (!stateParam || !channelId) {
    return errorResponse('Missing state or channelId', 400)
  }

  let state: {
    inviteToken: string
    showId: string
    orgId: string
    channels: { id: string; name: string }[]
  }

  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
  } catch {
    return errorResponse('Invalid state', 400)
  }

  const payload = verifyInviteToken(state.inviteToken)
  if (!payload) {
    return errorResponse('Invite link has expired', 401)
  }
  // SECURITY: bind the connection to the SIGNED show id, not the unsigned state blob.
  if (payload.provider !== 'youtube' || state.showId !== payload.showId) {
    return errorResponse('Invalid state', 400)
  }

  const channel = state.channels.find((c) => c.id === channelId)
  if (!channel) {
    return errorResponse('Channel not found', 404)
  }

  const cookieStore = await cookies()
  const tokenCookie = cookieStore.get('yt_connect_tokens')?.value
  if (!tokenCookie) {
    return errorResponse('Session expired. Please try connecting again.', 401)
  }

  let tokens: { accessToken: string; refreshToken?: string; expiresIn?: number }
  try {
    tokens = JSON.parse(decrypt(tokenCookie))
  } catch {
    return errorResponse('Invalid session. Please try connecting again.', 401)
  }

  cookieStore.delete('yt_connect_tokens')

  const supabase = createServiceClient()

  const expiresAt = tokens.expiresIn
    ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
    : null

  await supabase.from('distribution_connections').upsert({
    show_id: payload.showId,
    provider: 'youtube',
    external_show_id: channel.id,
    external_show_name: channel.name,
    access_token_enc: encrypt(tokens.accessToken),
    refresh_token_enc: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
    token_expires_at: expiresAt,
    connected_by: 'client',
  }, { onConflict: 'show_id,provider' })

  const origin = request.nextUrl.origin
  return jsonResponse({ redirect: `${origin}/connect/youtube?success=true` })
}
