import { getAdminClient } from '@/lib/admin/api-auth'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { service, error } = await getAdminClient()
  if (error) return error

  const { userId } = await params

  // Prevent self-deletion
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (currentUser?.id === userId) {
    return errorResponse('Cannot delete your own account', 400)
  }

  const { data: profile, error: fetchError } = await service!
    .from('user_profiles')
    .select('user_id, email')
    .eq('user_id', userId)
    .single()

  if (fetchError || !profile) {
    return errorResponse('User not found', 404)
  }

  const { error: deleteError } = await service!
    .auth.admin.deleteUser(userId)

  if (deleteError) {
    return errorResponse(deleteError.message, 500)
  }

  return jsonResponse({ deleted: true, user_id: userId })
}
