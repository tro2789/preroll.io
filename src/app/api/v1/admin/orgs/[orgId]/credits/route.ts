import { NextRequest } from 'next/server'
import { getAdminClient } from '@/lib/admin/api-auth'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { service, error } = await getAdminClient()
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

  // Fetch current balance
  const { data: addon, error: fetchError } = await service!
    .from('ai_addon')
    .select('credits_balance')
    .eq('org_id', orgId)
    .single()

  if (fetchError || !addon) {
    return errorResponse('AI add-on not enabled for this org', 404)
  }

  const newBalance = (addon.credits_balance ?? 0) + amount

  // Update balance
  const { error: updateError } = await service!
    .from('ai_addon')
    .update({ credits_balance: newBalance })
    .eq('org_id', orgId)

  if (updateError) {
    return errorResponse(updateError.message, 500)
  }

  // Insert audit record (negative credits_used = grant)
  await service!
    .from('ai_credit_usage')
    .insert({
      org_id: orgId,
      credits_used: -amount,
      balance_after: newBalance,
      reason: 'admin_grant',
    })

  return jsonResponse({ credits_balance: newBalance })
}
