import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrgEntitlements } from '@/lib/entitlements'

export async function GET() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const service = createServiceClient()

  const { data: memberships, error: memError } = await service
    .from('memberships')
    .select('id, user_id, role, created_at')
    .eq('org_id', org!.id)
    .order('created_at')

  if (memError) return errorResponse(memError.message, 500)

  const members = await Promise.all(
    (memberships ?? []).map(async (m) => {
      const { data: { user: u } } = await service.auth.admin.getUserById(m.user_id)
      return {
        id: m.id,
        user_id: m.user_id,
        email: u?.email ?? null,
        name: u?.user_metadata?.full_name ?? null,
        role: m.role,
        created_at: m.created_at,
      }
    })
  )

  const { data: invites, error: invError } = await service
    .from('team_invites')
    .select('id, email, role, invited_by, expires_at, created_at')
    .eq('org_id', org!.id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (invError) return errorResponse(invError.message, 500)

  const entitlements = await getOrgEntitlements(org!.id, org!.planId)

  return jsonResponse({ members, invites: invites ?? [], canInvite: entitlements.can('multi_user') })
}
