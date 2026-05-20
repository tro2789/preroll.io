import { getAdminClient } from '@/lib/admin/api-auth'
import { errorResponse } from '@/lib/api/helpers'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { service, error } = await getAdminClient()
  if (error) return error

  const { userId } = await params

  // Prevent self-revocation
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id === userId) {
    return errorResponse('Cannot revoke your own super admin access', 400)
  }

  const { error: deleteError } = await service!
    .from('super_admins')
    .delete()
    .eq('user_id', userId)

  if (deleteError) return errorResponse(deleteError.message, 500)

  return new Response(null, { status: 204 })
}
