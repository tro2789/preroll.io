import { createServiceClient } from '@/lib/supabase/server'
import { getOrgEntitlements } from '@/lib/entitlements'

export interface StorageUsage {
  usedBytes: number
  limitBytes: number | null
  usedPercent: number
  remaining: number | null
  addonTbs: number
  graceStartedAt: string | null
}

export async function getStorageUsage(orgId: string, planId?: string, trialEndsAt?: string | null): Promise<StorageUsage> {
  const supabase = createServiceClient()

  const [{ data: org }, entitlements] = await Promise.all([
    supabase.from('organizations').select('storage_used_bytes, storage_addon_tbs, storage_grace_started_at').eq('id', orgId).single(),
    getOrgEntitlements(orgId, planId, trialEndsAt),
  ])

  const usedBytes = org?.storage_used_bytes ?? 0
  const addonTbs = org?.storage_addon_tbs ?? 0
  const graceStartedAt = org?.storage_grace_started_at ?? null
  const limitMb = entitlements.limit('storage')
  const addonMb = addonTbs * 1_048_576
  const totalLimitMb = limitMb && limitMb > 0 ? limitMb + addonMb : (addonMb > 0 ? addonMb : null)
  const limitBytes = totalLimitMb ? totalLimitMb * 1024 * 1024 : null

  return {
    usedBytes,
    limitBytes,
    usedPercent: limitBytes ? Math.min(100, (usedBytes / limitBytes) * 100) : 0,
    remaining: limitBytes ? Math.max(0, limitBytes - usedBytes) : null,
    addonTbs,
    graceStartedAt,
  }
}

export async function checkQuota(orgId: string, additionalBytes: number, planId?: string, trialEndsAt?: string | null): Promise<{ allowed: boolean; usage: StorageUsage }> {
  const usage = await getStorageUsage(orgId, planId, trialEndsAt)

  if (usage.graceStartedAt) {
    return { allowed: false, usage }
  }

  if (usage.limitBytes === null) {
    return { allowed: true, usage }
  }

  const allowed = (usage.usedBytes + additionalBytes) <= usage.limitBytes
  return { allowed, usage }
}

export async function incrementUsage(orgId: string, bytes: number): Promise<number> {
  const supabase = createServiceClient()
  const { data } = await supabase.rpc('increment_storage_usage', { p_org_id: orgId, p_bytes: bytes })
  return data ?? 0
}

export async function decrementUsage(orgId: string, bytes: number): Promise<number> {
  const supabase = createServiceClient()
  const { data } = await supabase.rpc('decrement_storage_usage', { p_org_id: orgId, p_bytes: bytes })
  return data ?? 0
}

export async function recalculateUsage(orgId: string): Promise<number> {
  const supabase = createServiceClient()
  const { data } = await supabase.rpc('recalculate_storage_usage', { p_org_id: orgId })
  return data ?? 0
}

export async function syncGracePeriod(orgId: string, planId?: string, trialEndsAt?: string | null): Promise<void> {
  const usage = await getStorageUsage(orgId, planId, trialEndsAt)
  const supabase = createServiceClient()

  const isOverQuota = usage.limitBytes !== null && usage.usedBytes > usage.limitBytes

  if (isOverQuota && !usage.graceStartedAt) {
    await supabase
      .from('organizations')
      .update({ storage_grace_started_at: new Date().toISOString() })
      .eq('id', orgId)
  } else if (!isOverQuota && usage.graceStartedAt) {
    await supabase
      .from('organizations')
      .update({ storage_grace_started_at: null })
      .eq('id', orgId)
  }
}
