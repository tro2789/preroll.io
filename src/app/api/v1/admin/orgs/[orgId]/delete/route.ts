import { getAdminClient, logAdminAction } from '@/lib/admin/api-auth'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { service, actor, error } = await getAdminClient()
  if (error) return error

  const { orgId } = await params

  const { data: org, error: fetchError } = await service!
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .single()

  if (fetchError || !org) {
    return errorResponse('Organization not found', 404)
  }

  const { error: deleteError } = await service!
    .from('organizations')
    .delete()
    .eq('id', orgId)

  if (deleteError) {
    return errorResponse(deleteError.message, 500)
  }

  await logAdminAction(service!, actor, 'org.delete', {
    type: 'org', id: orgId, metadata: { name: org.name },
  })

  return jsonResponse({ deleted: true, id: orgId })
}
