import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getStorageUsage } from '@/lib/storage/usage'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const usage = await getStorageUsage(org!.id, org!.planId, org!.trialEndsAt)

  const supabase = createServiceClient()
  const { data: breakdown } = await supabase
    .from('file_references')
    .select('file_size, episodes(show_id, shows(name))')
    .eq('org_id', org!.id)
    .eq('provider', 'r2')

  const byShow = new Map<string, number>()
  for (const ref of breakdown || []) {
    const episode = ref.episodes as unknown as { shows: { name: string } | null } | null
    const showName = episode?.shows?.name || 'Unlinked'
    byShow.set(showName, (byShow.get(showName) || 0) + (ref.file_size || 0))
  }

  return jsonResponse({
    usedBytes: usage.usedBytes,
    limitBytes: usage.limitBytes,
    usedPercent: Math.round(usage.usedPercent * 10) / 10,
    remaining: usage.remaining,
    breakdown: Array.from(byShow.entries())
      .map(([show, bytes]) => ({ show, bytes }))
      .sort((a, b) => b.bytes - a.bytes),
  })
}
