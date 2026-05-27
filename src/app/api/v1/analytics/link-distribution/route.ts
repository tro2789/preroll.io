import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrgEntitlements } from '@/lib/entitlements'

export async function POST() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const entitlements = await getOrgEntitlements(org!.id, org!.planId, org!.trialEndsAt)
  if (!entitlements.can('analytics')) return errorResponse('Upgrade to Studio for audience analytics', 403)

  const service = createServiceClient()

  const { data: distConnections } = await service
    .from('distribution_connections')
    .select('show_id, provider, external_show_id, external_show_name, shows!inner(client_id, clients!inner(org_id))')
    .in('provider', ['transistor', 'castopod'])

  if (!distConnections?.length) return jsonResponse({ linked: 0 })

  const orgConnections = distConnections.filter((dc) => {
    const show = dc.shows as unknown as { client_id: string; clients: { org_id: string } }
    return show.clients.org_id === org!.id
  })

  let linked = 0

  for (const dc of orgConnections) {
    const { error: upsertError } = await service
      .from('analytics_connections')
      .upsert({
        show_id: dc.show_id,
        org_id: org!.id,
        provider: dc.provider,
        external_show_id: dc.external_show_id,
        sync_status: 'active',
      }, { onConflict: 'show_id,provider' })

    if (!upsertError) linked++
  }

  return jsonResponse({ linked })
}
