import { NextRequest } from 'next/server'
import { getAdminClient, logAdminAction } from '@/lib/admin/api-auth'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { service, actor, error } = await getAdminClient()
  if (error) return error

  const { orgId } = await params

  let body: { amount?: unknown }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  const amount = body.amount
  if (typeof amount !== 'number' || amount <= 0 || !Number.isFinite(amount)) {
    return errorResponse('amount must be a positive number')
  }

  const { data: addon } = await service!
    .from('ai_addon')
    .select('credits_balance')
    .eq('org_id', orgId)
    .single()

  let newBalance: number

  if (addon) {
    newBalance = (addon.credits_balance ?? 0) + amount
    const { error: updateError } = await service!
      .from('ai_addon')
      .update({ credits_balance: newBalance })
      .eq('org_id', orgId)
    if (updateError) return errorResponse(updateError.message, 500)
  } else {
    newBalance = amount
    const { error: insertError } = await service!
      .from('ai_addon')
      .insert({ org_id: orgId, enabled: true, credits_balance: newBalance })
    if (insertError) return errorResponse(insertError.message, 500)
  }

  await service!
    .from('ai_credit_usage')
    .insert({
      org_id: orgId,
      credits_used: -amount,
      balance_after: newBalance,
      reason: 'admin_grant',
    })

  await logAdminAction(service!, actor, 'org.grant_credits', {
    type: 'org', id: orgId, metadata: { amount, new_balance: newBalance },
  })

  return jsonResponse({ credits_balance: newBalance })
}
