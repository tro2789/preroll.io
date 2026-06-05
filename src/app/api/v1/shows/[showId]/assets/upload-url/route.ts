import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getShowForOrg } from '@/lib/api/ownership'
import { getUploadUrl } from '@/lib/r2/client'

const ALLOWED_ASSET_TYPES = [
  'cover_art',
  'intro',
  'outro',
  'music_bed',
  'thumbnail',
  'show_notes',
  'clip',
  'other',
] as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error
  if (!(await getShowForOrg(supabase!, showId, org!.id))) return errorResponse('Show not found', 404)

  const body = await request.json()
  const { filename, contentType, assetType } = body

  if (!filename || !contentType || !assetType) {
    return errorResponse('filename, contentType, and assetType are required', 400)
  }

  if (!ALLOWED_ASSET_TYPES.includes(assetType)) {
    return errorResponse(
      `Invalid assetType. Allowed: ${ALLOWED_ASSET_TYPES.join(', ')}`,
      400
    )
  }

  // Sanitize filename so the object key cannot traverse out of the show's prefix.
  const safeFilename = String(filename).replace(/[/\\]/g, '_').replace(/\.{2,}/g, '_')

  const uuid = crypto.randomUUID()
  const fileKey = `shows/${showId}/${assetType}/${uuid}-${safeFilename}`

  const uploadUrl = await getUploadUrl(fileKey, contentType)

  return jsonResponse({ uploadUrl, fileKey })
}
