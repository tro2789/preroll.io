import { createServiceClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from './crypto'
import { getProvider } from './registry'
import { ensureProvidersRegistered } from './init'
import type { IntegrationProvider } from './types'

const REFRESH_BUFFER_MS = 30 * 60 * 1000

export async function getValidToken(orgId: string, providerName: IntegrationProvider): Promise<string> {
  ensureProvidersRegistered()
  const supabase = createServiceClient()

  const { data: integration, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('org_id', orgId)
    .eq('provider', providerName)
    .single()

  if (error || !integration) {
    throw new Error(`No ${providerName} integration found. Connect it in Settings.`)
  }

  const needsRefresh = integration.token_expires_at &&
    new Date(integration.token_expires_at).getTime() - Date.now() < REFRESH_BUFFER_MS

  if (!needsRefresh) {
    return decrypt(integration.access_token_enc)
  }

  if (!integration.refresh_token_enc) {
    throw new Error(`${providerName} token expired and no refresh token available. Reconnect in Settings.`)
  }

  const provider = getProvider(providerName)
  const refreshToken = decrypt(integration.refresh_token_enc)
  const result = await provider.refreshAccessToken(refreshToken)

  const updates: Record<string, unknown> = {
    access_token_enc: encrypt(result.accessToken),
    token_expires_at: result.expiresAt?.toISOString() || null,
  }

  if (result.refreshToken) {
    updates.refresh_token_enc = encrypt(result.refreshToken)
  }

  await supabase
    .from('user_integrations')
    .update(updates)
    .eq('id', integration.id)

  return result.accessToken
}

export async function getIntegrationAccountId(orgId: string, providerName: IntegrationProvider): Promise<string> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('user_integrations')
    .select('account_id')
    .eq('org_id', orgId)
    .eq('provider', providerName)
    .single()

  if (!data?.account_id) {
    throw new Error(`No account_id found for ${providerName}. Reconnect in Settings.`)
  }
  return data.account_id
}
