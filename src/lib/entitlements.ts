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

export interface TrialInfo {
  active: boolean
  daysLeft: number
  endsAt: string
}

export interface Entitlements {
  planId: string
  trial: TrialInfo | null
  can(feature: Feature): boolean
  limit(feature: Feature): number | null
}

const UNLIMITED: Entitlements = {
  planId: 'self_hosted',
  trial: null,
  can: () => true,
  limit: () => null,
}

export async function getOrgEntitlements(orgId: string, knownPlanId?: string): Promise<Entitlements> {
  if (isSelfHosted()) return UNLIMITED

  const supabase = createServiceClient()

  let planId: string
  let trialEndsAt: string | null = null

  if (knownPlanId) {
    planId = knownPlanId
    const { data: org } = await supabase
      .from('organizations')
      .select('trial_ends_at')
      .eq('id', orgId)
      .single()
    trialEndsAt = org?.trial_ends_at ?? null
  } else {
    const { data: org } = await supabase
      .from('organizations')
      .select('plan_id, trial_ends_at')
      .eq('id', orgId)
      .single()
    planId = org?.plan_id || 'free'
    trialEndsAt = org?.trial_ends_at ?? null
  }

  const trialActive = trialEndsAt ? new Date(trialEndsAt) > new Date() : false
  const trial: TrialInfo | null = trialEndsAt
    ? {
        active: trialActive,
        daysLeft: trialActive ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
        endsAt: trialEndsAt,
      }
    : null

  const effectivePlan = trialActive && planId === 'free' ? 'studio' : planId

  const { data: entitlements } = await supabase
    .from('plan_entitlements')
    .select('feature, limit_value, enabled')
    .eq('plan_id', effectivePlan)

  const featureMap = new Map<string, { limit: number | null; enabled: boolean }>()
  for (const e of entitlements || []) {
    featureMap.set(e.feature, { limit: e.limit_value, enabled: e.enabled })
  }

  return {
    planId,
    trial,
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
