import { createServiceClient } from '@/lib/supabase/server'

export interface OrgContext {
  id: string
  planId: string
  role: string
}

export async function resolveUserOrg(userId: string): Promise<OrgContext | null> {
  const supabase = createServiceClient()

  const { data: membership } = await supabase
    .from('memberships')
    .select('org_id, role, organizations(plan_id)')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (!membership) return null

  const org = membership.organizations as unknown as { plan_id: string } | null

  return {
    id: membership.org_id,
    planId: org?.plan_id || 'free',
    role: membership.role,
  }
}

export async function resolveOrgFromApiKey(orgId: string): Promise<OrgContext | null> {
  const supabase = createServiceClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id, plan_id')
    .eq('id', orgId)
    .single()

  if (!org) return null

  return {
    id: org.id,
    planId: org.plan_id,
    role: 'owner',
  }
}
