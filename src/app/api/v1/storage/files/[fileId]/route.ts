import { getAuthenticatedClient, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { deleteObject } from '@/lib/r2/client'
import { decrementUsage } from '@/lib/storage/usage'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const supabase = createServiceClient()
  const { data: fileRef } = await supabase
    .from('file_references')
    .select('id, external_id, file_size, org_id, provider')
    .eq('id', fileId)
    .single()

  if (!fileRef || fileRef.org_id !== org!.id) return errorResponse('File not found', 404)
  if (fileRef.provider !== 'r2') return errorResponse('Only built-in storage files can be deleted here', 400)

  try {
    await deleteObject(fileRef.external_id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete file'
    return errorResponse(message, 500)
  }

  await Promise.all([
    supabase.from('file_references').delete().eq('id', fileRef.id),
    fileRef.file_size ? decrementUsage(org!.id, fileRef.file_size) : null,
  ])

  return new Response(null, { status: 204 })
}
