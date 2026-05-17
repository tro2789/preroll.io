import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { completeMultipartUpload } from '@/lib/r2/client'

export async function POST(request: Request) {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const { key, uploadId, parts } = body

  if (!key || !uploadId || !Array.isArray(parts)) {
    return errorResponse('key, uploadId, and parts are required', 400)
  }

  for (const part of parts) {
    if (typeof part.partNumber !== 'number' || typeof part.etag !== 'string') {
      return errorResponse('Each part must have partNumber (number) and etag (string)', 400)
    }
  }

  const { data: fileRef } = await createServiceClient()
    .from('file_references')
    .select('org_id')
    .eq('external_id', key)
    .eq('provider', 'r2')
    .single()

  if (!fileRef || fileRef.org_id !== org!.id) {
    return errorResponse('File not found or access denied', 403)
  }

  try {
    await completeMultipartUpload(key, uploadId, parts)
    return jsonResponse({ status: 'complete' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to complete upload'
    return errorResponse(message, 500)
  }
}
