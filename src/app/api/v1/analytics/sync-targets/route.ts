import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrgEntitlements } from '@/lib/entitlements'

export async function GET() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const entitlements = await getOrgEntitlements(org!.id, org!.planId, org!.trialEndsAt)
  if (!entitlements.can('analytics')) return errorResponse('Upgrade to Studio for audience analytics', 403)

  const service = createServiceClient()

  const { data: connections, error: dbError } = await service
    .from('analytics_connections')
    .select('id, show_id, provider, external_show_id, last_synced_at, sync_status, sync_error, shows(id, name)')
    .eq('org_id', org!.id)
    .eq('sync_status', 'active')

  if (dbError) return errorResponse(dbError.message, 500)

  return jsonResponse(connections ?? [])
}
