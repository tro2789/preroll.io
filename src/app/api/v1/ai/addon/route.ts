import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { isSelfHosted } from '@/lib/entitlements'
import { getAiAddonStatus, type AiAddonStatus } from '@/lib/ai/entitlements'
import { encrypt } from '@/lib/integrations/crypto'

function formatAddonResponse(status: AiAddonStatus) {
  return {
    enabled: status.enabled,
    credits_balance: status.creditsBalance,
    monthly_allowance: status.monthlyAllowance,
    monthly_used: status.monthlyUsed,
    monthly_remaining: status.monthlyRemaining,
    cycle_reset_at: status.cycleResetAt,
  }
}

export async function GET() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const status = await getAiAddonStatus(org!.id)

  return jsonResponse({
    addon: formatAddonResponse(status),
    selfHosted: status.selfHosted,
  })
}

export async function POST(request: Request) {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const { deepgram_api_key, anthropic_api_key } = body as {
    deepgram_api_key?: string
    anthropic_api_key?: string
  }

  if (!isSelfHosted()) {
    return errorResponse('API key configuration is only available for self-hosted instances', 403)
  }

  const supabase = createServiceClient()

  const update: Record<string, unknown> = {}
  if (deepgram_api_key !== undefined) {
    update.deepgram_api_key_enc = deepgram_api_key ? encrypt(deepgram_api_key) : null
  }
  if (anthropic_api_key !== undefined) {
    update.anthropic_api_key_enc = anthropic_api_key ? encrypt(anthropic_api_key) : null
  }

  const { data: existing } = await supabase
    .from('ai_addon')
    .select('id')
    .eq('org_id', org!.id)
    .single()

  if (existing) {
    await supabase
      .from('ai_addon')
      .update(update)
      .eq('org_id', org!.id)
  } else {
    await supabase
      .from('ai_addon')
      .insert({ org_id: org!.id, enabled: true, ...update })
  }

  const status = await getAiAddonStatus(org!.id)

  return jsonResponse({ addon: formatAddonResponse(status) })
}
