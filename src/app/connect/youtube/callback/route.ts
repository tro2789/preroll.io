import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyInviteToken } from '@/lib/integrations/invite-token'
import { encrypt } from '@/lib/integrations/crypto'
import { ytJson } from '@/lib/integrations/providers/youtube'

const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const code = request.nextUrl.searchParams.get('code')
  const stateParam = request.nextUrl.searchParams.get('state')
  const oauthError = request.nextUrl.searchParams.get('error')

  if (oauthError) {
    const msg = encodeURIComponent('Google authorization was denied or cancelled.')
    return NextResponse.redirect(`${origin}/connect/youtube?error=${msg}`)
  }

  if (!code || !stateParam) {
    const msg = encodeURIComponent('Missing authorization code.')
    return NextResponse.redirect(`${origin}/connect/youtube?error=${msg}`)
  }

  let state: { inviteToken: string; showId: string; orgId: string }
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
  } catch {
    const msg = encodeURIComponent('Invalid state parameter.')
    return NextResponse.redirect(`${origin}/connect/youtube?error=${msg}`)
  }

  const payload = verifyInviteToken(state.inviteToken)
  if (!payload) {
    const msg = encodeURIComponent('Invite link has expired. Ask your producer for a new link.')
    return NextResponse.redirect(`${origin}/connect/youtube?error=${msg}`)
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_DRIVE_CLIENT_ID || ''
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_DRIVE_CLIENT_SECRET || ''
  const redirectUri = `${origin}/connect/youtube/callback`

  try {
    const tokenRes = await fetch(GOOGLE_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      console.error('YouTube client OAuth token exchange failed:', body)
      const msg = encodeURIComponent('Failed to exchange authorization code. Please try again.')
      return NextResponse.redirect(`${origin}/connect/youtube?token=${state.inviteToken}&error=${msg}`)
    }

    const tokens = await tokenRes.json()

    const channels = await ytJson('/channels?part=snippet&mine=true&maxResults=50', tokens.access_token)
    const channelItems = channels.items || []

    if (channelItems.length === 0) {
      const msg = encodeURIComponent('No YouTube channels found on this Google account.')
      return NextResponse.redirect(`${origin}/connect/youtube?token=${state.inviteToken}&error=${msg}`)
    }

    if (channelItems.length === 1) {
      return saveAndRedirect(origin, state, tokens, channelItems[0])
    }

    // Multiple channels — redirect to picker
    const channelData = channelItems.map((ch: Record<string, unknown>) => {
      const snippet = ch.snippet as Record<string, unknown>
      return { id: ch.id, name: snippet?.title || 'Unknown' }
    })

    const pickerState = Buffer.from(JSON.stringify({
      inviteToken: state.inviteToken,
      showId: state.showId,
      orgId: state.orgId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      channels: channelData,
    })).toString('base64url')

    return NextResponse.redirect(`${origin}/connect/youtube/pick-channel?state=${pickerState}`)

  } catch (err) {
    console.error('YouTube client OAuth error:', err)
    const msg = encodeURIComponent('An unexpected error occurred. Please try again.')
    return NextResponse.redirect(`${origin}/connect/youtube?token=${state.inviteToken}&error=${msg}`)
  }
}

async function saveAndRedirect(
  origin: string,
  state: { showId: string; orgId: string; inviteToken: string },
  tokens: { access_token: string; refresh_token?: string; expires_in?: number },
  channel: Record<string, unknown>,
) {
  const snippet = channel.snippet as Record<string, unknown>
  const channelId = channel.id as string
  const channelName = (snippet?.title as string) || 'YouTube Channel'

  const supabase = createServiceClient()

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null

  await supabase.from('distribution_connections').upsert({
    show_id: state.showId,
    provider: 'youtube',
    external_show_id: channelId,
    external_show_name: channelName,
    access_token_enc: encrypt(tokens.access_token),
    refresh_token_enc: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    token_expires_at: expiresAt,
    connected_by: 'client',
  }, { onConflict: 'show_id,provider' })

  return NextResponse.redirect(`${origin}/connect/youtube?success=true`)
}
