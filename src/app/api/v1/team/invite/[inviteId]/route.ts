import { getAuthenticatedClient, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/org/roles'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'admin')
  if (roleError) return roleError

  const { inviteId } = await params

  const service = createServiceClient()

  const { error: deleteError } = await service
    .from('team_invites')
    .delete()
    .eq('id', inviteId)
    .eq('org_id', org!.id)

  if (deleteError) return errorResponse(deleteError.message, 500)

  return new NextResponse(null, { status: 204 })
}
