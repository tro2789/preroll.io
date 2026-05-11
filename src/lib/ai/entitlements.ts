import { createServiceClient } from '@/lib/supabase/server'
import { isSelfHosted } from '@/lib/entitlements'
import { decrypt } from '@/lib/integrations/crypto'

export interface AiAddonStatus {
  enabled: boolean
  creditsBalance: number
  monthlyAllowance: number
  monthlyUsed: number
  monthlyRemaining: number
  cycleResetAt: string | null
  selfHosted: boolean
  deepgramApiKey: string | null
  anthropicApiKey: string | null
}

const UNLIMITED: AiAddonStatus = {
  enabled: true,
  creditsBalance: Infinity,
  monthlyAllowance: Infinity,
  monthlyUsed: 0,
  monthlyRemaining: Infinity,
  cycleResetAt: null,
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

  const [{ data: addon }, { data: org }] = await Promise.all([
    supabase
      .from('ai_addon')
      .select('credits_balance, monthly_credits_used, cycle_reset_at')
      .eq('org_id', orgId)
      .single(),
    supabase
      .from('organizations')
      .select('plan_id, trial_ends_at')
      .eq('id', orgId)
      .single(),
  ])

  const planId = org?.plan_id || 'free'
  const trialActive = org?.trial_ends_at && new Date(org.trial_ends_at) > new Date() && planId === 'free'

  let monthlyAllowance = 0
  if (trialActive) {
    monthlyAllowance = 50
  } else {
    const { data: entitlement } = await supabase
      .from('plan_entitlements')
      .select('ai_credits_monthly')
      .eq('plan_id', planId)
      .limit(1)
      .single()
    monthlyAllowance = entitlement?.ai_credits_monthly || 0
  }

  const isEnabled = planId === 'pro' || planId === 'studio' || !!trialActive
  const monthlyUsed = addon?.monthly_credits_used || 0
  const monthlyRemaining = Math.max(0, monthlyAllowance - monthlyUsed)
  const creditsBalance = addon?.credits_balance || 0

  return {
    enabled: isEnabled,
    creditsBalance,
    monthlyAllowance,
    monthlyUsed,
    monthlyRemaining,
    cycleResetAt: addon?.cycle_reset_at || null,
    selfHosted: false,
    deepgramApiKey: null,
    anthropicApiKey: null,
  }
}

export function totalAvailableCredits(addon: AiAddonStatus): number {
  if (addon.selfHosted) return Infinity
  return addon.monthlyRemaining + addon.creditsBalance
}

export async function consumeCredits(
  orgId: string,
  amount: number,
  reason: string,
  referenceId: string
): Promise<{ success: boolean; balance: number; fromMonthly?: number; fromPurchased?: number }> {
  if (isSelfHosted()) return { success: true, balance: Infinity }

  const supabase = createServiceClient()

  const { data, error } = await supabase.rpc('consume_ai_credits_v2', {
    p_org_id: orgId,
    p_amount: amount,
    p_reason: reason,
    p_reference_id: referenceId,
  })

  if (error || !data) {
    return { success: false, balance: 0 }
  }

  return {
    success: data.success,
    balance: (data.monthly_remaining ?? 0) + (data.purchased_remaining ?? 0),
    fromMonthly: data.from_monthly,
    fromPurchased: data.from_purchased,
  }
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
