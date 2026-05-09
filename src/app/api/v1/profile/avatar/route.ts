import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getUploadUrl } from '@/lib/r2/client'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024

export async function POST(request: Request) {
  const { user, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const contentType = body.contentType?.trim()
  const fileSize = body.fileSize

  if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
    return errorResponse(`Unsupported file type. Allowed: ${ALLOWED_TYPES.join(', ')}`)
  }

  if (!fileSize || fileSize > MAX_SIZE) {
    return errorResponse('File size required and must be under 2MB')
  }

  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
  const key = `profiles/${user!.id}/avatar.${ext}`
  const uploadUrl = await getUploadUrl(key, contentType)

  return jsonResponse({ uploadUrl, key })
}
