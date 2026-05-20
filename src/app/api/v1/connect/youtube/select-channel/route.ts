import { NextRequest } from 'next/server'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyInviteToken } from '@/lib/integrations/invite-token'
import { encrypt } from '@/lib/integrations/crypto'

export async function POST(request: NextRequest) {
  const { state: stateParam, channelId } = await request.json()

  if (!stateParam || !channelId) {
    return errorResponse('Missing state or channelId', 400)
  }

  let state: {
    inviteToken: string
    showId: string
    orgId: string
    accessToken: string
    refreshToken?: string
    expiresIn?: number
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

  const channel = state.channels.find((c) => c.id === channelId)
  if (!channel) {
    return errorResponse('Channel not found', 404)
  }

  const supabase = createServiceClient()

  const expiresAt = state.expiresIn
    ? new Date(Date.now() + state.expiresIn * 1000).toISOString()
    : null

  await supabase.from('distribution_connections').upsert({
    show_id: state.showId,
    provider: 'youtube',
    external_show_id: channel.id,
    external_show_name: channel.name,
    access_token_enc: encrypt(state.accessToken),
    refresh_token_enc: state.refreshToken ? encrypt(state.refreshToken) : null,
    token_expires_at: expiresAt,
    connected_by: 'client',
  }, { onConflict: 'show_id,provider' })

  const origin = request.nextUrl.origin
  return jsonResponse({ redirect: `${origin}/connect/youtube?success=true` })
}
