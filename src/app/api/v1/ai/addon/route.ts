import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { isSelfHosted } from '@/lib/entitlements'
import { encrypt } from '@/lib/integrations/crypto'

export async function GET() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('ai_addon')
    .select('enabled, credits_balance, created_at')
    .eq('org_id', org!.id)
    .single()

  return jsonResponse({
    addon: data || { enabled: false, credits_balance: 0 },
    selfHosted: isSelfHosted(),
  })
}

export async function POST(request: Request) {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const { enabled, deepgram_api_key, anthropic_api_key } = body as {
    enabled?: boolean
    deepgram_api_key?: string
    anthropic_api_key?: string
  }

  const supabase = createServiceClient()

  const update: Record<string, unknown> = {}
  if (typeof enabled === 'boolean') update.enabled = enabled
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
      .insert({ org_id: org!.id, ...update })
  }

  const { data } = await supabase
    .from('ai_addon')
    .select('enabled, credits_balance, created_at')
    .eq('org_id', org!.id)
    .single()

  return jsonResponse({ addon: data })
}
