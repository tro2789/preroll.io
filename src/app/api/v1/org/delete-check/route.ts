import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/org/roles'

export async function GET() {
  const { user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'owner')
  if (roleError) return roleError

  const service = createServiceClient()

  const [{ count: memberCount }, { count: clientCount }] = await Promise.all([
    service
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org!.id)
      .neq('user_id', user!.id),
    service
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org!.id),
  ])

  const members = memberCount ?? 0
  const clients = clientCount ?? 0
  const canDelete = members === 0 && clients === 0

  return jsonResponse({ canDelete, blockers: { members, clients } })
}
