import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { computeTrialInfo } from '@/lib/entitlements'

export async function GET() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const supabase = createServiceClient()

  const { data: orgData } = await supabase
    .from('organizations')
    .select('plan_id, plan_status, trial_ends_at')
    .eq('id', org!.id)
    .single()

  if (!orgData) return errorResponse('Organization not found', 404)

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, cancel_at_period_end')
    .eq('org_id', org!.id)
    .maybeSingle()

  const trial = computeTrialInfo(orgData.trial_ends_at)

  return jsonResponse({
    plan_id: orgData.plan_id,
    plan_status: orgData.plan_status,
    subscription: subscription || undefined,
    trial: trial ? {
      active: trial.active,
      days_left: trial.daysLeft,
      ends_at: trial.endsAt,
    } : undefined,
  })
}
