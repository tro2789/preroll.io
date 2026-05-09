import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { getProvider, isValidProvider } from '@/lib/integrations/registry'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { encrypt } from '@/lib/integrations/crypto'
import { resolveUserOrg } from '@/lib/org/resolve'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerName } = await params
  const origin = request.nextUrl.origin
  const code = request.nextUrl.searchParams.get('code')
  const stateParam = request.nextUrl.searchParams.get('state')

  if (!code || !stateParam) {
    return NextResponse.redirect(`${origin}/app/settings/developer?error=missing_params`)
  }

  ensureProvidersRegistered()

  if (!isValidProvider(providerName)) {
    return NextResponse.redirect(`${origin}/app/settings/developer?error=unknown_provider`)
  }

  let state: { userId: string; provider: string; nonce: string; returnTo?: string }
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
  } catch {
    return NextResponse.redirect(`${origin}/app/settings/developer?error=invalid_state`)
  }

  const cookieStore = await cookies()
  const storedNonce = cookieStore.get('oauth_nonce')?.value
  if (!storedNonce || storedNonce !== state.nonce) {
    return NextResponse.redirect(`${origin}/app/settings/developer?error=csrf_mismatch`)
  }

  cookieStore.delete('oauth_nonce')

  if (state.provider !== providerName) {
    return NextResponse.redirect(`${origin}/app/settings/developer?error=provider_mismatch`)
  }

  const provider = getProvider(providerName)
  const redirectUri = `${origin}${provider.oauthConfig.callbackPath}`

  try {
    const result = await provider.exchangeCode(code, redirectUri)
    const supabase = createServiceClient()

    let workspaceId: string | null = null
    if (providerName === 'frame_io' && result.account.id) {
      try {
        const wsRes = await fetch(`https://api.frame.io/v4/accounts/${result.account.id}/workspaces`, {
          headers: { Authorization: `Bearer ${result.accessToken}` },
        })
        const wsJson = await wsRes.json()
        const workspaces = wsJson.data || wsJson
        if (Array.isArray(workspaces) && workspaces.length > 0) {
          workspaceId = workspaces[0].id
        }
      } catch {}
    } else if (providerName === 'google_drive') {
      workspaceId = 'root'
    } else if (providerName === 'vimeo') {
      workspaceId = result.account.id
    }

    const userOrg = await resolveUserOrg(state.userId)
    if (!userOrg) {
      return NextResponse.redirect(`${origin}/app/settings/developer?error=no_organization`)
    }

    await supabase.from('user_integrations').upsert({
      user_id: state.userId,
      org_id: userOrg.id,
      provider: providerName,
      access_token_enc: encrypt(result.accessToken),
      refresh_token_enc: result.refreshToken ? encrypt(result.refreshToken) : null,
      token_expires_at: result.expiresAt?.toISOString() || null,
      account_id: result.account.id,
      account_name: result.account.name,
      account_email: result.account.email || null,
      account_avatar_url: result.account.avatarUrl || null,
      scopes: provider.oauthConfig.scopes.join(' '),
      workspace_id: workspaceId,
    }, { onConflict: 'org_id,provider' })

    const successUrl = state.returnTo?.startsWith('/app/')
      ? `${origin}${state.returnTo}`
      : `${origin}/app/settings/developer?connected=${providerName}`
    return NextResponse.redirect(successUrl)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`OAuth callback error for ${providerName}:`, message)
    const detail = encodeURIComponent(message.slice(0, 200))
    return NextResponse.redirect(`${origin}/app/settings/developer?error=exchange_failed&detail=${detail}`)
  }
}
