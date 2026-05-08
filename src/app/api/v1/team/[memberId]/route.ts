import { getAuthenticatedClient, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/org/roles'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'admin')
  if (roleError) return roleError

  const { memberId } = await params

  const service = createServiceClient()

  const { data: membership, error: fetchError } = await service
    .from('memberships')
    .select('id, user_id, role')
    .eq('id', memberId)
    .eq('org_id', org!.id)
    .single()

  if (fetchError || !membership) return errorResponse('Member not found', 404)
  if (membership.role === 'owner') return errorResponse('Cannot remove the org owner', 403)
  if (membership.user_id === user!.id) return errorResponse('Cannot remove yourself', 400)

  const { error: deleteError } = await service
    .from('memberships')
    .delete()
    .eq('id', memberId)

  if (deleteError) return errorResponse(deleteError.message, 500)

  return new NextResponse(null, { status: 204 })
}
