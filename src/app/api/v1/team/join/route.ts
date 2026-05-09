import { jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const body = await request.json()
  const token = body.token?.trim()
  if (!token) return errorResponse('token is required')

  const service = createServiceClient()

  const { data: invite, error: fetchError } = await service
    .from('team_invites')
    .select('id, org_id, email, role, accepted_at, expires_at')
    .eq('token', token)
    .single()

  if (fetchError || !invite) return errorResponse('Invalid invite token', 404)
  if (invite.accepted_at) return errorResponse('This invite has already been accepted', 400)
  if (new Date(invite.expires_at) < new Date()) return errorResponse('This invite has expired', 400)
  if (invite.email !== user!.email) return errorResponse('This invite was sent to a different email address', 403)

  const { data: existingMembership } = await service
    .from('memberships')
    .select('id')
    .eq('org_id', invite.org_id)
    .eq('user_id', user!.id)
    .single()

  if (existingMembership) {
    return errorResponse('You are already a member of this organization', 409)
  }

  const { data: membership, error: insertError } = await service
    .from('memberships')
    .insert({
      org_id: invite.org_id,
      user_id: user!.id,
      role: invite.role,
    })
    .select('id, org_id, user_id, role, created_at')
    .single()

  if (insertError) return errorResponse(insertError.message, 500)

  await service
    .from('team_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  const { data: orgData } = await service
    .from('organizations')
    .select('id, name, plan_id')
    .eq('id', invite.org_id)
    .single()

  return jsonResponse({
    membership,
    organization: orgData,
  }, 201)
}
