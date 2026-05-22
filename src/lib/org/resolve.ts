import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/server'

export interface OrgContext {
  id: string
  planId: string
  trialEndsAt: string | null
  role: string
  defaultDeliveryProvider: string | null
}

export const resolveUserOrg = cache(async (userId: string, preferredOrgId?: string): Promise<OrgContext | null> => {
  const supabase = createServiceClient()

  const { data: memberships } = await supabase
    .from('memberships')
    .select('org_id, role, organizations(plan_id, trial_ends_at, default_delivery_provider)')
    .eq('user_id', userId)

  if (!memberships || memberships.length === 0) return null

  let membership = memberships[0]

  if (preferredOrgId) {
    const match = memberships.find((m) => m.org_id === preferredOrgId)
    if (match) membership = match
  } else if (memberships.length > 1) {
    membership = memberships.find((m) => m.role !== 'owner') || memberships[0]
  }

  const org = membership.organizations as unknown as { plan_id: string; trial_ends_at: string | null; default_delivery_provider: string | null } | null

  return {
    id: membership.org_id,
    planId: org?.plan_id || 'free',
    trialEndsAt: org?.trial_ends_at ?? null,
    role: membership.role,
    defaultDeliveryProvider: org?.default_delivery_provider ?? null,
  }
})

export async function resolveOrgFromApiKey(orgId: string, userId?: string): Promise<OrgContext | null> {
  const supabase = createServiceClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id, plan_id, trial_ends_at, default_delivery_provider')
    .eq('id', orgId)
    .single()

  if (!org) return null

  let role = 'member'
  if (userId) {
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .single()
    if (membership) role = membership.role
  }

  return {
    id: org.id,
    planId: org.plan_id,
    trialEndsAt: org.trial_ends_at ?? null,
    role,
    defaultDeliveryProvider: org.default_delivery_provider ?? null,
  }
}
