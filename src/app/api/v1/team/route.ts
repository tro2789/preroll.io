import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrgEntitlements } from '@/lib/entitlements'

export async function GET() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const service = createServiceClient()

  const [{ data: memberships, error: memError }, entitlements] = await Promise.all([
    service
      .from('memberships')
      .select('id, user_id, role, created_at, user_profiles(email, display_name, avatar_url)')
      .eq('org_id', org!.id)
      .order('created_at'),
    getOrgEntitlements(org!.id, org!.planId, org!.trialEndsAt),
  ])

  if (memError) return errorResponse(memError.message, 500)

  const canInvite = entitlements.can('multi_user')

  const members = (memberships ?? []).map((m) => {
    const profile = m.user_profiles as unknown as { email: string | null; display_name: string | null; avatar_url: string | null } | null
    return {
      id: m.id,
      user_id: m.user_id,
      email: profile?.email ?? null,
      name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      role: m.role,
      created_at: m.created_at,
    }
  })

  let invites: Record<string, unknown>[] = []
  if (canInvite) {
    const { data, error: invError } = await service
      .from('team_invites')
      .select('id, email, role, invited_by, expires_at, created_at')
      .eq('org_id', org!.id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (invError) return errorResponse(invError.message, 500)
    invites = data ?? []
  }

  return jsonResponse({ members, invites, canInvite })
}
