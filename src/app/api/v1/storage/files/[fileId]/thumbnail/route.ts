import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { getUploadUrl, resolveImageUrl } from '@/lib/r2/client'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const supabase = createServiceClient()
  const { data: fileRef } = await supabase
    .from('file_references')
    .select('id, org_id, provider, episode_id')
    .eq('id', fileId)
    .single()

  if (!fileRef || fileRef.org_id !== org!.id) return errorResponse('File not found', 404)
  if (fileRef.provider !== 'r2') return errorResponse('Only R2 files support thumbnail upload', 400)

  const body = await request.json()
  const { contentType } = body

  const key = `thumbnails/files/${fileId}.jpg`
  const uploadUrl = await getUploadUrl(key, contentType || 'image/jpeg')

  return jsonResponse({ uploadUrl, key })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const supabase = createServiceClient()
  const body = await request.json()
  const { key } = body

  if (!key) return errorResponse('key is required', 400)

  const thumbnailUrl = resolveImageUrl(key)

  const { error: dbError } = await supabase
    .from('file_references')
    .update({ thumbnail_url: thumbnailUrl })
    .eq('id', fileId)
    .eq('org_id', org!.id)

  if (dbError) return errorResponse(dbError.message, 500)

  return jsonResponse({ thumbnail_url: thumbnailUrl })
}
