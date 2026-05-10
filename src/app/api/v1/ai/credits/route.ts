import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')

  const supabase = createServiceClient()

  const { data: addon } = await supabase
    .from('ai_addon')
    .select('credits_balance')
    .eq('org_id', org!.id)
    .single()

  const { data: usage } = await supabase
    .from('ai_credit_usage')
    .select('*')
    .eq('org_id', org!.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  const { data: purchases } = await supabase
    .from('ai_credit_purchases')
    .select('*')
    .eq('org_id', org!.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return jsonResponse({
    balance: addon?.credits_balance ?? 0,
    usage: usage || [],
    purchases: purchases || [],
  })
}
