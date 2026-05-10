import { createServiceClient } from '@/lib/supabase/server'
import { isSelfHosted } from '@/lib/entitlements'
import { decrypt } from '@/lib/integrations/crypto'

export interface AiAddonStatus {
  enabled: boolean
  creditsBalance: number
  selfHosted: boolean
  deepgramApiKey: string | null
  anthropicApiKey: string | null
}

const UNLIMITED: AiAddonStatus = {
  enabled: true,
  creditsBalance: Infinity,
  selfHosted: true,
  deepgramApiKey: null,
  anthropicApiKey: null,
}

export async function getAiAddonStatus(orgId: string): Promise<AiAddonStatus> {
  if (isSelfHosted()) {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('ai_addon')
      .select('deepgram_api_key_enc, anthropic_api_key_enc')
      .eq('org_id', orgId)
      .single()

    return {
      ...UNLIMITED,
      deepgramApiKey: data?.deepgram_api_key_enc ? decrypt(data.deepgram_api_key_enc) : null,
      anthropicApiKey: data?.anthropic_api_key_enc ? decrypt(data.anthropic_api_key_enc) : null,
    }
  }

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('ai_addon')
    .select('enabled, credits_balance')
    .eq('org_id', orgId)
    .single()

  if (!data) {
    return { enabled: false, creditsBalance: 0, selfHosted: false, deepgramApiKey: null, anthropicApiKey: null }
  }

  return {
    enabled: data.enabled,
    creditsBalance: data.credits_balance,
    selfHosted: false,
    deepgramApiKey: null,
    anthropicApiKey: null,
  }
}

export async function consumeCredits(
  orgId: string,
  amount: number,
  reason: string,
  referenceId: string
): Promise<{ success: boolean; balance: number }> {
  if (isSelfHosted()) return { success: true, balance: Infinity }

  const supabase = createServiceClient()

  const { data, error } = await supabase.rpc('consume_ai_credits', {
    p_org_id: orgId,
    p_amount: amount,
    p_reason: reason,
    p_reference_id: referenceId,
  })

  if (error || !data) {
    return { success: false, balance: 0 }
  }

  return { success: data.success, balance: data.balance_after }
}

export async function refundCredits(
  orgId: string,
  amount: number,
  reason: string,
  referenceId: string
): Promise<void> {
  if (isSelfHosted()) return

  const supabase = createServiceClient()

  await supabase.rpc('refund_ai_credits', {
    p_org_id: orgId,
    p_amount: amount,
    p_reason: reason,
    p_reference_id: referenceId,
  })
}

export function getDeepgramApiKey(addon: AiAddonStatus): string {
  if (addon.selfHosted && addon.deepgramApiKey) return addon.deepgramApiKey
  const key = process.env.DEEPGRAM_API_KEY
  if (!key) throw new Error('DEEPGRAM_API_KEY is not configured')
  return key
}

export function getAnthropicApiKey(addon: AiAddonStatus): string {
  if (addon.selfHosted && addon.anthropicApiKey) return addon.anthropicApiKey
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not configured')
  return key
}
