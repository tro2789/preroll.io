import { createServiceClient } from '@/lib/supabase/server'

export interface OrgContext {
  id: string
  planId: string
  trialEndsAt: string | null
  role: string
}

export async function resolveUserOrg(userId: string): Promise<OrgContext | null> {
  const supabase = createServiceClient()

  const { data: membership } = await supabase
    .from('memberships')
    .select('org_id, role, organizations(plan_id, trial_ends_at)')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (!membership) return null

  const org = membership.organizations as unknown as { plan_id: string; trial_ends_at: string | null } | null

  return {
    id: membership.org_id,
    planId: org?.plan_id || 'free',
    trialEndsAt: org?.trial_ends_at ?? null,
    role: membership.role,
  }
}

export async function resolveOrgFromApiKey(orgId: string): Promise<OrgContext | null> {
  const supabase = createServiceClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id, plan_id, trial_ends_at')
    .eq('id', orgId)
    .single()

  if (!org) return null

  return {
    id: org.id,
    planId: org.plan_id,
    trialEndsAt: org.trial_ends_at ?? null,
    role: 'owner',
  }
}
