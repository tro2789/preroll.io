import { createServiceClient } from '@/lib/supabase/server'

export interface OrgContext {
  id: string
  planId: string
  trialEndsAt: string | null
  role: string
}

export async function resolveUserOrg(userId: string): Promise<OrgContext | null> {
  const supabase = createServiceClient()

  const { data: memberships } = await supabase
    .from('memberships')
    .select('org_id, role, organizations(plan_id, trial_ends_at)')
    .eq('user_id', userId)

  if (!memberships || memberships.length === 0) return null

  // If user has multiple memberships (e.g. auto-created org + invited org),
  // prefer the one where they're NOT owner (the invited org).
  // For single-org users this is a no-op.
  const membership = memberships.length > 1
    ? memberships.find((m) => m.role !== 'owner') || memberships[0]
    : memberships[0]

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
