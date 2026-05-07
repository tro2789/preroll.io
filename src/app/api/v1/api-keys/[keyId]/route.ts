import { getAuthenticatedClient, errorResponse } from '@/lib/api/helpers'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const { keyId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { error: dbError } = await supabase!
    .from('api_keys')
    .delete()
    .eq('id', keyId)

  if (dbError) return errorResponse(dbError.message, 500)
  return new Response(null, { status: 204 })
}
