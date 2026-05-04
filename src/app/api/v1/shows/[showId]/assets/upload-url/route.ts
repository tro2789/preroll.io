import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getUploadUrl } from '@/lib/r2/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const { filename, contentType, assetType } = body

  if (!filename || !contentType || !assetType) {
    return errorResponse('filename, contentType, and assetType are required', 400)
  }

  const uuid = crypto.randomUUID()
  const fileKey = `shows/${showId}/${assetType}/${uuid}-${filename}`

  const uploadUrl = await getUploadUrl(fileKey, contentType)

  return jsonResponse({ uploadUrl, fileKey })
}
