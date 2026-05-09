import { createServiceClient } from '@/lib/supabase/server'

export function isSelfHosted(): boolean {
  return process.env.PREROLL_SELF_HOSTED === 'true'
}

export type Feature =
  | 'max_clients'
  | 'max_shows'
  | 'integrations'
  | 'webhooks'
  | 'api_keys'
  | 'mcp'
  | 'templates'
  | 'client_portal'
  | 'multi_user'
  | 'white_label'
  | 'reporting'

export interface Entitlements {
  planId: string
  can(feature: Feature): boolean
  limit(feature: Feature): number | null
}

const UNLIMITED: Entitlements = {
  planId: 'self_hosted',
  can: () => true,
  limit: () => null,
}

export async function getOrgEntitlements(orgId: string, knownPlanId?: string): Promise<Entitlements> {
  if (isSelfHosted()) return UNLIMITED

  const supabase = createServiceClient()

  let planId: string
  if (knownPlanId) {
    planId = knownPlanId
  } else {
    const { data: org } = await supabase
      .from('organizations')
      .select('plan_id')
      .eq('id', orgId)
      .single()
    planId = org?.plan_id || 'free'
  }

  const { data: entitlements } = await supabase
    .from('plan_entitlements')
    .select('feature, limit_value, enabled')
    .eq('plan_id', planId)

  const featureMap = new Map<string, { limit: number | null; enabled: boolean }>()
  for (const e of entitlements || []) {
    featureMap.set(e.feature, { limit: e.limit_value, enabled: e.enabled })
  }

  return {
    planId,
    can(feature: Feature): boolean {
      const entry = featureMap.get(feature)
      return entry?.enabled ?? false
    },
    limit(feature: Feature): number | null {
      const entry = featureMap.get(feature)
      if (!entry?.enabled) return 0
      return entry.limit
    },
  }
}
