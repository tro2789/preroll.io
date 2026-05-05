import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getProvider, isValidProvider } from '@/lib/integrations/registry'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { encrypt } from '@/lib/integrations/crypto'

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerName } = await params
  const origin = request.nextUrl.origin
  const code = request.nextUrl.searchParams.get('code')
  const stateParam = request.nextUrl.searchParams.get('state')

  if (!code || !stateParam) {
    return NextResponse.redirect(`${origin}/app/settings/integrations?error=missing_params`)
  }

  ensureProvidersRegistered()

  if (!isValidProvider(providerName)) {
    return NextResponse.redirect(`${origin}/app/settings/integrations?error=unknown_provider`)
  }

  let state: { userId: string; provider: string; nonce: string }
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
  } catch {
    return NextResponse.redirect(`${origin}/app/settings/integrations?error=invalid_state`)
  }

  const cookieStore = await cookies()
  const storedNonce = cookieStore.get('oauth_nonce')?.value
  if (!storedNonce || storedNonce !== state.nonce) {
    return NextResponse.redirect(`${origin}/app/settings/integrations?error=csrf_mismatch`)
  }

  cookieStore.delete('oauth_nonce')

  if (state.provider !== providerName) {
    return NextResponse.redirect(`${origin}/app/settings/integrations?error=provider_mismatch`)
  }

  const provider = getProvider(providerName)
  const redirectUri = `${origin}${provider.oauthConfig.callbackPath}`

  try {
    const result = await provider.exchangeCode(code, redirectUri)
    const supabase = getServiceClient()

    await supabase.from('user_integrations').upsert({
      user_id: state.userId,
      provider: providerName,
      access_token_enc: encrypt(result.accessToken),
      refresh_token_enc: result.refreshToken ? encrypt(result.refreshToken) : null,
      token_expires_at: result.expiresAt?.toISOString() || null,
      account_id: result.account.id,
      account_name: result.account.name,
      account_email: result.account.email || null,
      account_avatar_url: result.account.avatarUrl || null,
      scopes: provider.oauthConfig.scopes.join(' '),
    }, { onConflict: 'user_id,provider' })

    return NextResponse.redirect(`${origin}/app/settings/integrations?connected=${providerName}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`OAuth callback error for ${providerName}:`, message)
    return NextResponse.redirect(`${origin}/app/settings/integrations?error=exchange_failed`)
  }
}
