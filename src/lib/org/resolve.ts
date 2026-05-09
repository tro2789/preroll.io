import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/server'

export interface OrgContext {
  id: string
  planId: string
  trialEndsAt: string | null
  role: string
}

export const resolveUserOrg = cache(async (userId: string, preferredOrgId?: string): Promise<OrgContext | null> => {
  const supabase = createServiceClient()

  const { data: memberships } = await supabase
    .from('memberships')
    .select('org_id, role, organizations(plan_id, trial_ends_at)')
    .eq('user_id', userId)

  if (!memberships || memberships.length === 0) return null

  let membership = memberships[0]

  if (preferredOrgId) {
    const match = memberships.find((m) => m.org_id === preferredOrgId)
    if (match) membership = match
  } else if (memberships.length > 1) {
    membership = memberships.find((m) => m.role !== 'owner') || memberships[0]
  }

  const org = membership.organizations as unknown as { plan_id: string; trial_ends_at: string | null } | null

  return {
    id: membership.org_id,
    planId: org?.plan_id || 'free',
    trialEndsAt: org?.trial_ends_at ?? null,
    role: membership.role,
  }
})

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
